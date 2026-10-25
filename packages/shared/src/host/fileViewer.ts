import * as vscode from 'vscode';
import type { HostMessage, WebviewMessage } from '../protocol';
import { getWebviewHtml } from './webviewHtml';

export interface FileViewerOptions {
  viewType: string;
  /** dist/webview/<webviewName>.js */
  webviewName: string;
  title: string;
  allowWasm?: boolean;
}

type SaveMessage = Extract<WebviewMessage, { type: 'save' }>;

class FileDocument implements vscode.CustomDocument {
  panel?: vscode.WebviewPanel;
  /** webview 側で未保存の編集がある */
  dirty = false;
  /** VS Code のタブを未保存表示にしている */
  markedDirty = false;
  /** 次に webview が書き込みを終えた時に呼ぶ (VS Code の保存待ち) */
  saveWaiters: Array<{ resolve: () => void; reject: (e: Error) => void }> = [];
  constructor(readonly uri: vscode.Uri) {}
  dispose(): void {}
}

/** webview から渡された内容を元ファイルへ直接上書きする。saveAs のときは保存先を選ばせる。 */
async function writeFromWebview(uri: vscode.Uri, msg: SaveMessage): Promise<void> {
  let target = uri;
  if (msg.saveAs) {
    const picked = await vscode.window.showSaveDialog({ defaultUri: uri });
    if (!picked) throw new Error('保存をキャンセルしました');
    target = picked;
  }
  await vscode.workspace.fs.writeFile(target, Buffer.from(msg.base64, 'base64'));
}

/**
 * ファイルを開くだけで webview に bytes を渡して表示する汎用 CustomEditor。
 * webview が dirty を通知すると VS Code のタブが「未保存」表示になり、
 * VS Code 側の保存操作は webview の保存 (doSave) に中継される。
 */
export function registerFileViewer(context: vscode.ExtensionContext, opts: FileViewerOptions): void {
  const changed = new vscode.EventEmitter<vscode.CustomDocumentContentChangeEvent<FileDocument>>();

  const provider: vscode.CustomEditorProvider<FileDocument> = {
    onDidChangeCustomDocument: changed.event,
    openCustomDocument: (uri) => new FileDocument(uri),

    async resolveCustomEditor(document, panel) {
      document.panel = panel;
      panel.onDidDispose(() => {
        if (document.panel === panel) document.panel = undefined;
      });
      panel.webview.options = {
        enableScripts: true,
        // 拡張機能の dist 配下のみ読み込み可。ワークスペースや端末の他の場所は不可。
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview')],
      };
      panel.webview.html = getWebviewHtml(panel.webview, context.extensionUri, {
        name: opts.webviewName,
        title: opts.title,
        allowWasm: opts.allowWasm,
      });

      const post = (m: HostMessage) => panel.webview.postMessage(m);
      panel.webview.onDidReceiveMessage(async (msg: WebviewMessage) => {
        if (msg.type === 'dirty') {
          document.dirty = msg.dirty;
          if (msg.dirty && !document.markedDirty) {
            document.markedDirty = true;
            changed.fire({ document });
          } else if (!msg.dirty && document.markedDirty && panel.active) {
            // webview 内の保存で未編集に戻った: VS Code の保存を呼んで未保存表示を消す
            void vscode.commands.executeCommand('workbench.action.files.save');
          }
          return;
        }
        if (msg.type === 'save') {
          let error: string | undefined;
          try {
            await writeFromWebview(document.uri, msg);
          } catch (e) {
            error = e instanceof Error ? e.message : String(e);
          }
          const waiters = document.saveWaiters.splice(0);
          for (const w of waiters) (error ? w.reject(new Error(error)) : w.resolve());
          await post({ type: 'saved', requestId: msg.requestId, error });
          return;
        }
        if (msg.type !== 'ready') return;
        try {
          const bytes = await vscode.workspace.fs.readFile(document.uri);
          const fileName = document.uri.path.split('/').pop() ?? '';
          await post({ type: 'init', fileName, base64: Buffer.from(bytes).toString('base64') });
        } catch (e) {
          await post({ type: 'error', message: String(e) });
        }
      });
    },

    async saveCustomDocument(document) {
      if (document.dirty && document.panel) {
        const done = new Promise<void>((resolve, reject) => {
          document.saveWaiters.push({ resolve, reject });
          setTimeout(() => reject(new Error('保存がタイムアウトしました')), 15000);
        });
        await document.panel.webview.postMessage({ type: 'doSave' } satisfies HostMessage);
        await done;
      }
      document.dirty = false;
      document.markedDirty = false;
    },

    async saveCustomDocumentAs(document, destination) {
      await provider.saveCustomDocument(document, undefined as never);
      await vscode.workspace.fs.copy(document.uri, destination, { overwrite: true });
    },

    async revertCustomDocument(document) {
      document.dirty = false;
      document.markedDirty = false;
    },

    // 編集内容は webview 内にあり host には無い。ホットイグジットでの復元は未対応。
    backupCustomDocument: async (document) => ({ id: document.uri.toString(), delete: () => {} }),
  };

  context.subscriptions.push(
    changed,
    vscode.window.registerCustomEditorProvider(opts.viewType, provider, {
      supportsMultipleEditorsPerDocument: false,
      webviewOptions: { retainContextWhenHidden: false },
    }),
  );
}
