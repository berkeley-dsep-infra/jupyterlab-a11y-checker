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
  // 1. Images
  ['image-alt', 'Images'],

  // TODO: 2. Headings
  ['page-has-heading-one', 'Headings'],
  ['heading-order', 'Headings'],

  // TODO: 3. Lists

  // TODO: 4. Tables
  ['td-has-header', 'Tables'],
  ['table-has-caption', 'Tables']

  // TODO: 5. Color

  // TODO: 6. Links

  // TODO: 7. Other
]);
