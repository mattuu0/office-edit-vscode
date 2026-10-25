/**
 * host -> webview
 * バイト列は postMessage で Uint8Array を送ると壊れるため base64 文字列で運ぶ。
 */
export type HostMessage =
  | { type: 'init'; fileName: string; base64: string }
  | { type: 'error'; message: string }
  | { type: 'saved'; requestId: number; error?: string }
  /** VS Code 側の保存操作 (⌘S / 閉じる時の確認) をエディタに伝える */
  | { type: 'doSave' };

/** webview -> host */
export type WebviewMessage =
  | { type: 'ready' }
  | { type: 'dirty'; dirty: boolean }
  | { type: 'save'; requestId: number; fileName: string; base64: string; saveAs: boolean };
