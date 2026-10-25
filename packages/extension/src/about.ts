import * as vscode from 'vscode';

const IBIS_URL = 'https://github.com/ibisjp/ibis-office';

/** ibisOffice の NOTICE (AGPL-3.0 section 7(b)) が求める表示: "Powered by ibisOffice" とリンク */
export function registerAboutCommand(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('officeEdit.about', async () => {
      const open = 'ibisOffice を開く';
      const choice = await vscode.window.showInformationMessage(
        'Office Edit — Powered by ibisOffice (AGPL-3.0)\nOffice ファイルの表示・編集に ibisOffice を使用しています。' + IBIS_URL,
        { modal: true },
        open,
      );
      if (choice === open) void vscode.env.openExternal(vscode.Uri.parse(IBIS_URL));
    }),
  );
}
