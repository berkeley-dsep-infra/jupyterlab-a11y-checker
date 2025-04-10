export const issueCategoryNames = [
  'Images',
  'Headings',
  'Lists',
  'Tables',
  'Color',
  'Links',
  'Other'
];

export const issueToCategory = new Map<string, string>([
  // Images
  ['image-alt', 'Images'],

  // TODO: Headings

  // TODO: Lists

  // Tables
  ['td-has-header', 'Tables'],
  ['table-has-caption', 'Tables']

  // TODO: Color

  // TODO: Links

  // TODO: Other
]);
