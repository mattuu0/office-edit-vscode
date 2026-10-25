import type * as vscode from 'vscode';

/** 各 feature パッケージが export する単位。extension パッケージが束ねる。 */
export interface Feature {
  readonly id: string;
  activate(context: vscode.ExtensionContext): void;
}
