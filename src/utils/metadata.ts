import { IIssueInformation } from './types';

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
  ['table-missing-scope', 'Tables'],

  // TODO: 4. Color
  ['color-insufficient-cc-normal', 'Color'],
  ['color-insufficient-cc-large', 'Color']

  // TODO: Lists

  // TODO: Links

  // TODO: Other
]);

export const issueToDescription = new Map<string, IIssueInformation>([
  // 1. Images
  [
    'image-missing-alt',
    {
      title: 'Missing Alt Text',
      description: 'This image is missing alt text.',
      detailedDescription:
        'Images must have alternate text to describe their content for screen reader users. Without alt text, users who rely on screen readers will miss important visual information.'
    }
  ],

  // TODO: 2. Headings
  [
    'heading-missing-h1',
    {
      title: 'Missing H1 Heading',
      description: 'This notebook is missing a level-one heading.',
      detailedDescription:
        'Ensure that the page or at least one of its frames contains a level-one heading. A missing level-one heading can leave screen reader users without a clear starting point, making it harder to understand the main purpose or content of the page. Please also ensure that headings contain descriptive, accurate text.',
      descriptionUrl:
        'https://dequeuniversity.com/rules/axe/4.7/heading-missing-h1'
    }
  ],
  [
    'heading-duplicate-h1',
    {
      title: 'Duplicate H1 Heading',
      description: 'This notebook has multiple level-one headings.',
      detailedDescription:
        'Ensure there is only one level-one heading (h1) in the notebook. The h1 heading should be at the top of the document and serve as the main title. Additional h1 headings can confuse screen reader users about the document structure. Please also ensure that headings contain descriptive, accurate text.'
    }
  ],
  [
    'heading-duplicate',
    {
      title: 'Duplicate Heading',
      description: 'This heading appears multiple times at the same level.',
      detailedDescription:
        'Ensure identical headings are not used at the same level. This can be confusing for screen reader users as it creates redundant landmarks in the document structure. Please consider combining the sections or using different heading text.'
    }
  ],
  [
    'heading-wrong-order',
    {
      title: 'Wrong Heading Order',
      description: 'This heading skips levels or is out of order.',
      detailedDescription:
        'Ensure the order of headings is semantically correct. Headings provide essential structure for screen reader users to navigate a page. Skipping levels or using headings out of order can make the content feel disorganized or inaccessible. Please also ensure that headings contain descriptive, accurate text.'
    }
  ],
  [
    'heading-empty',
    {
      title: 'Empty Heading',
      description: 'This heading has no text content.',
      detailedDescription:
        'Ensure headings have discernible text. Headings provide essential structure for screen reader users to navigate a page. When a heading is empty, it creates confusion and disrupts this experience.'
    }
  ],

  // TODO: 3. Tables
  [
    'table-missing-header',
    {
      title: 'Missing Table Header',
      description: 'This table is missing header cells.',
      detailedDescription:
        'Tables must have header cells to provide context for the data. Without headers, screen reader users cannot understand the relationship between data cells and their meaning. Please add appropriate header cells using the <th> tag.'
    }
  ],
  [
    'table-missing-caption',
    {
      title: 'Missing Table Caption',
      description: 'This table is missing a caption.',
      detailedDescription:
        'Tables should have captions to provide a brief description of their content. Captions help screen reader users understand the purpose and context of the table data. Please add a caption using the <caption> tag.'
    }
  ],
  [
    'table-missing-scope',
    {
      title: 'Missing Table Scope',
      description: 'This table is missing a scope attribute.',
      detailedDescription: 'Table headers must have scope attributes.'
    }
  ],

  // TODO: 4. Color
  [
    'color-insufficient-cc-normal',
    {
      title: 'Insufficient Color Contrast',
      description: 'This text has insufficient color contrast.',
      detailedDescription:
        'Text must have sufficient contrast with its background to be readable. For normal text, the contrast ratio should be at least 4.5:1. This ensures that users with visual impairments can read the content.'
    }
  ],
  [
    'color-insufficient-cc-large',
    {
      title: 'Insufficient Color Contrast',
      description: 'This large text has insufficient color contrast.',
      detailedDescription:
        'Large text must have sufficient contrast with its background to be readable. For large text (18pt or 14pt bold), the contrast ratio should be at least 3:1. This ensures that users with visual impairments can read the content.'
    }
  ]

  // TODO: Lists

  // TODO: Links

  // TODO: Other
]);
