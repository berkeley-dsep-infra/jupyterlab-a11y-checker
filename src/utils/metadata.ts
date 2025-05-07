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
      description:
        'All images must have alternate text to convey their purpose and meaning to screen reader users.',
      detailedDescription:
        "Ensure all informative images have short, descriptive alternate text. Screen readers have no way of translating an image into words that gets read to the user, even if the image only consists of text. As a result, it's necessary for images to have short, descriptive alt text so screen reader users clearly understand the image's contents and purpose.",
      descriptionUrl: 'https://dequeuniversity.com/rules/axe/4.4/image-alt'
    }
  ],

  // TODO: 2. Headings
  [
    'heading-missing-h1',
    {
      title: 'Missing H1 Heading',
      description:
        'Ensure a single H1 tag is present at the top of the notebook.',
      detailedDescription:
        'Screen reader users can use keyboard shortcuts to navigate directly to the first h1, which, in principle, should allow them to jump directly to the main content of the web page. If there is no h1, or if the h1 appears somewhere other than at the start of the main content, screen reader users must listen to more of the web page to understand its structure, wasting valuable time. Please also ensure that headings contain descriptive, accurate text.',
      descriptionUrl:
        'https://dequeuniversity.com/rules/axe/4.1/page-has-heading-one'
    }
  ],
  [
    'heading-duplicate-h1',
    {
      title: 'Duplicate H1 Heading',
      description:
        'Ensure there is only one level-one heading (h1) in the notebook.',
      detailedDescription:
        'The h1 heading should be at the top of the document and serve as the main title. Additional h1 headings can confuse screen reader users about the document structure. Please also ensure that headings contain descriptive, accurate text.'
    }
  ],
  [
    'heading-duplicate',
    {
      title: 'Duplicate Heading',
      description:
        'Ensure identical headings are not used at the same level in the notebook.',
      detailedDescription:
        'This can be confusing for screen reader users as it creates redundant landmarks in the document structure. Please consider combining the sections or using different heading text.'
    }
  ],
  [
    'heading-wrong-order',
    {
      title: 'Wrong Heading Order',
      description:
        'Headings must be in a valid logical order, meaning H1 through H6 element tags must appear in a sequentially-descending order.',
      detailedDescription:
        'Ensure the order of headings is semantically correct. Headings provide essential structure for screen reader users to navigate a page. Skipping levels or using headings out of order can make the content feel disorganized or inaccessible. Please also ensure that headings contain descriptive, accurate text.',
      descriptionUrl:
        'https://dequeuniversity.com/rules/axe/pdf/2.0/heading-order'
    }
  ],
  [
    'heading-empty',
    {
      title: 'Empty Heading',
      description: 'Ensure that a heading element contains content.',
      detailedDescription:
        'Ensure headings have discernible text. Headings provide essential structure for screen reader users to navigate a page. When a heading is empty, it creates confusion and disrupts this experience.',
      descriptionUrl: 'https://dequeuniversity.com/rules/axe/4.2/empty-heading'
    }
  ],

  // TODO: 3. Tables
  [
    'table-missing-header',
    {
      title: 'Missing Table Header',
      description: 'Ensure that a table has a row, column, or both headers.',
      detailedDescription:
        'Tables must have header cells to provide context for the data. Without headers, screen reader users cannot understand the relationship between data cells and their meaning. Please add appropriate header cells using the <th> tag.'
    }
  ],
  [
    'table-missing-caption',
    {
      title: 'Missing Table Caption',
      description: 'Ensure that a table has a caption.',
      detailedDescription:
        'Tables should have captions to provide a brief description of their content. Captions help screen reader users understand the purpose and context of the table data. Please add a caption using the <caption> tag.'
    }
  ],
  [
    'table-missing-scope',
    {
      title: 'Missing Table Scope',
      description: 'Ensure that a table has a scope attribute.',
      detailedDescription: 'Table headers must have scope attributes.'
    }
  ],

  // TODO: 4. Color
  [
    'color-insufficient-cc-normal',
    {
      title: 'Insufficient Color Contrast',
      description:
        'Ensure that a text in an image has sufficient color contrast.',
      detailedDescription:
        'Text must have sufficient contrast with its background to be readable. For normal text, the contrast ratio should be at least 4.5:1. This ensures that users with visual impairments can read the content.',
      descriptionUrl: 'https://dequeuniversity.com/rules/axe/3.5/color-contrast'
    }
  ],
  [
    'color-insufficient-cc-large',
    {
      title: 'Insufficient Color Contrast',
      description:
        'Ensure that a large text in an image has sufficient color contrast.',
      detailedDescription:
        'Large text must have sufficient contrast with its background to be readable. For large text (18pt or 14pt bold), the contrast ratio should be at least 3:1. This ensures that users with visual impairments can read the content.',
      descriptionUrl: 'https://dequeuniversity.com/rules/axe/3.5/color-contrast'
    }
  ]

  // TODO: Lists

  // TODO: Links

  // TODO: Other
]);
