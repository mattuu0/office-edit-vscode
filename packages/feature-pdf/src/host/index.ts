import { registerFileViewer, type Feature } from '@office-edit/shared';

export const pdfFeature: Feature = {
  id: 'pdf',
  activate(context) {
    registerFileViewer(context, { viewType: 'officeEdit.pdf', webviewName: 'pdf', title: 'PDF' });
  },
};
