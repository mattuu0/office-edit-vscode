import type * as vscode from 'vscode';
import type { Feature } from '@office-edit/shared';
import { officeFeature } from '@office-edit/feature-office';
import { pdfFeature } from '@office-edit/feature-pdf';

import { registerAboutCommand } from './about';
import { registerDefaultViewerCommands } from './defaultViewer';

const features: Feature[] = [officeFeature, pdfFeature];

export function activate(context: vscode.ExtensionContext): void {
  registerAboutCommand(context);
  registerDefaultViewerCommands(context);
  for (const f of features) f.activate(context);
}

export function deactivate(): void {}
