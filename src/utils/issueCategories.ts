export const issueCategoryNames = ['Images', 'Color', 'Tables', 'Other'];

export const issueToCategory = new Map<string, string>([
  // Images
  ['image-alt', 'Images'],

  // Color
  ['color-contrast', 'Color'],
  ['color-contrast-enhanced', 'Color'],

  // Tables
  ['td-has-header', 'Tables'],
  ['table-has-caption', 'Tables']
]);
