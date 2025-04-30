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
  ['heading-duplicate-h1', 'Headings'],
  ['heading-duplicate', 'Headings'],
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

export const issueToDescription = new Map<string, string>([
  // 1. Images
  ['image-missing-alt', 'This image is missing alt-text.'],

  // TODO: 2. Headings
  ['heading-missing-h1', 'This notebook is missing a H1 heading.'],
  ['heading-duplicate-h1', 'This notebook has multiple H1 headings.'],
  ['heading-duplicate', 'This heading appears multiple times in the notebook.'],
  ['heading-wrong-order', 'This heading is out of order.'],
  ['heading-empty', 'This heading is empty.'],

  // TODO: 3. Tables
  ['table-missing-header', 'This table is missing a header.'],
  ['table-missing-caption', 'This table is missing a caption.'],

  // TODO: 4. Color
  ['color-insufficient-cc-normal', 'This image has bad color contrast.'],
  [
    'color-insufficient-cc-large',
    'This image has bad color contrast for large text.'
  ]

  // TODO: Lists

  // TODO: Links

  // TODO: Other
]);
