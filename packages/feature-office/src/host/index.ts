import { registerFileViewer, type Feature } from '@office-edit/shared';

export const officeFeature: Feature = {
  id: 'office',
  activate(context) {
    registerFileViewer(context, {
      viewType: 'officeEdit.office',
      webviewName: 'office',
      title: 'Office',
      allowWasm: true,
    });
  },
};
