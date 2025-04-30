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
  ['image-missing-alt', 'Images'],

  // TODO: 2. Headings
  ['heading-missing-h1', 'Headings'],
  ['heading-duplicate', 'Headings'],
  ['heading-duplicate-h1', 'Headings'],
  ['heading-wrong-order', 'Headings'],
  ['heading-empty', 'Headings'],

  // TODO: 3. Tables
  ['table-missing-header', 'Tables'],
  ['table-missing-caption', 'Tables'],

  // TODO: 4. Color
  ['color-insufficient-cc-normal', 'Color'],
  ['color-insufficient-cc-large', 'Color']

  // TODO: Lists

  // TODO: Links

  // TODO: Other
]);
