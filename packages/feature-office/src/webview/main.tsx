import { decodeBase64, requestSave, vscodeApi } from '../../../shared/src/webview/vscode';
import type { HostMessage } from '../../../shared/src/protocol';
// scripts/build-ibis.sh が vendor/ibis-office/www/pkg を生成する
import init, { run } from '../../../../vendor/ibis-office/www/pkg/ibis_office_app.js';

// patches/ibis-office/0001-browser-save-hook.patch が呼ぶフック: ⌘S / 名前を付けて保存
(window as unknown as { ibisOfficeSaveFile: typeof requestSave }).ibisOfficeSaveFile = requestSave;

// 未保存の編集の有無を host に伝える。VS Code の保存操作 (doSave) は次の poll で ibis の保存になる。
let saveRequested = false;
const w = window as unknown as Record<string, unknown>;
w.ibisOfficeDirtyChanged = (dirty: boolean) => vscodeApi.postMessage({ type: 'dirty', dirty });
w.ibisOfficeTakeSaveRequest = () => {
  const r = saveRequested;
  saveRequested = false;
  return r;
};

const root = document.getElementById('root')!;
const show = (text: string, isError = false) => {
  root.className = `p-4 ${isError ? 'text-red-500' : ''}`;
  root.textContent = text;
};

// このスクリプトと同じ dist/webview/ に ibis/ が同梱される
const base = (document.currentScript as HTMLScriptElement).src.replace(/\/[^/]*$/, '/ibis');

async function start(fileName: string, bytes: Uint8Array) {
  if (!('gpu' in navigator)) {
    show('この環境の webview は WebGPU に対応していません。', true);
    return;
  }
  try {
    show('ibisOffice を起動しています…');
    await init({ module_or_path: fetch(`${base}/ibis_office_app_bg.wasm`) });
    root.remove();
    // アイコン等は <base>/assets/icons/*.svg から取得される(絶対 URL 必須)
    console.log('[office-edit] open', fileName, bytes.byteLength, 'bytes');
    run(base, fileName, bytes);
  } catch (e) {
    show(`起動できませんでした: ${e}`, true);
  }
}

window.addEventListener('message', (e: MessageEvent<HostMessage>) => {
  const m = e.data;
  if (m.type === 'init') void start(m.fileName, decodeBase64(m.base64));
  else if (m.type === 'doSave') saveRequested = true;
  else if (m.type === 'error') show(m.message, true);
});
show('読み込み中…');
vscodeApi.postMessage({ type: 'ready' });
