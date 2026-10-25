import { useEffect, useState } from 'react';
import type { HostMessage, WebviewMessage } from '../protocol';

interface VsCodeApi {
  postMessage(msg: WebviewMessage): void;
}
declare function acquireVsCodeApi(): VsCodeApi;

export function decodeBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function encodeBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export const vscodeApi = acquireVsCodeApi();

let saveSeq = 0;
const pendingSaves = new Map<number, { resolve: () => void; reject: (e: Error) => void }>();

window.addEventListener('message', (e: MessageEvent<HostMessage>) => {
  const m = e.data;
  if (m.type !== 'saved') return;
  const p = pendingSaves.get(m.requestId);
  pendingSaves.delete(m.requestId);
  if (m.error) p?.reject(new Error(m.error));
  else p?.resolve();
});

/** host にファイルを書かせる。bytes は wasm メモリ上の view のことがあるので即コピーして送る。 */
export function requestSave(fileName: string, bytes: Uint8Array, saveAs: boolean): Promise<void> {
  const requestId = ++saveSeq;
  const base64 = encodeBase64(bytes);
  return new Promise((resolve, reject) => {
    pendingSaves.set(requestId, { resolve, reject });
    vscodeApi.postMessage({ type: 'save', requestId, fileName, base64, saveAs });
  });
}

export type FileState =
  | { status: 'loading' }
  | { status: 'ready'; fileName: string; bytes: Uint8Array }
  | { status: 'error'; message: string };

/** host に ready を送り、ファイル bytes を受け取る */
export function useHostFile(): FileState {
  const [state, setState] = useState<FileState>({ status: 'loading' });
  useEffect(() => {
    const onMsg = (e: MessageEvent<HostMessage>) => {
      const m = e.data;
      if (m.type === 'init') setState({ status: 'ready', fileName: m.fileName, bytes: decodeBase64(m.base64) });
      else if (m.type === 'error') setState({ status: 'error', message: m.message });
    };
    window.addEventListener('message', onMsg);
    vscodeApi.postMessage({ type: 'ready' });
    return () => window.removeEventListener('message', onMsg);
  }, []);
  return state;
}
