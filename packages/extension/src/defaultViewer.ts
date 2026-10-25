import * as vscode from 'vscode';

/** 拡張子 → customEditors の viewType (package.json の contributes.customEditors と揃える) */
const ASSOCIATIONS: Record<string, string> = {
  '*.docx': 'officeEdit.office',
  '*.xlsx': 'officeEdit.office',
  '*.pptx': 'officeEdit.office',
  '*.pdf': 'officeEdit.pdf',
};

const VIEW_TYPES = new Set(Object.values(ASSOCIATIONS));

/** この拡張機能のもの (旧名 allViewer.* で設定されたものも含む)。名前を変えたため、古い ID は動かない。 */
const isOurs = (viewType: string) => VIEW_TYPES.has(viewType) || viewType.startsWith('allViewer.');

function withoutOurs(current: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(current).filter(([, v]) => !isOurs(v)));
}

function associations(): Record<string, string> {
  return { ...(vscode.workspace.getConfiguration('workbench').get<Record<string, string>>('editorAssociations') ?? {}) };
}

function update(next: Record<string, string>): Thenable<void> {
  return vscode.workspace
    .getConfiguration('workbench')
    .update('editorAssociations', next, vscode.ConfigurationTarget.Global);
}

/** 他の拡張機能 (PDF ビューアなど) が設定していても、Office Edit を既定にする */
async function setAsDefault(): Promise<void> {
  await update({ ...withoutOurs(associations()), ...ASSOCIATIONS });
  void vscode.window.showInformationMessage('Office Edit を docx / xlsx / pptx / pdf の既定のエディタに設定しました。');
}

/** Office Edit の割り当てだけを外す (他の設定は残す) */
async function resetDefault(): Promise<void> {
  await update(withoutOurs(associations()));
  void vscode.window.showInformationMessage('Office Edit の既定設定を解除しました。');
}

export function registerDefaultViewerCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('officeEdit.setAsDefault', setAsDefault),
    vscode.commands.registerCommand('officeEdit.resetDefault', resetDefault),
  );
}
