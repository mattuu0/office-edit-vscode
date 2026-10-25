import * as vscode from 'vscode';
import { randomBytes } from 'node:crypto';

export interface WebviewHtmlOptions {
  /** dist/webview/<name>.js|css */
  name: string;
  title: string;
  /** WASM を実行する feature のみ true */
  allowWasm?: boolean;
}

/** 外部通信を一切許可しない厳格 CSP の HTML を返す */
export function getWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri, opts: WebviewHtmlOptions): string {
  const nonce = randomBytes(16).toString('base64');
  const asset = (file: string) =>
    webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview', file));
  const csp = [
    `default-src 'none'`,
    `script-src 'nonce-${nonce}'${opts.allowWasm ? ` 'wasm-unsafe-eval'` : ''}`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `img-src ${webview.cspSource} data: blob:`,
    `font-src ${webview.cspSource}`,
    `worker-src ${webview.cspSource} blob:`,
    `connect-src ${webview.cspSource}`,
    `form-action 'none'`,
    `base-uri 'none'`,
  ].join('; ');

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${opts.title}</title>
<link rel="stylesheet" href="${asset(`${opts.name}.css`)}">
</head>
<body class="m-0 h-screen overflow-hidden">
<div id="root" class="h-full"></div>
<script nonce="${nonce}" src="${asset(`${opts.name}.js`)}"></script>
</body>
</html>`;
}
