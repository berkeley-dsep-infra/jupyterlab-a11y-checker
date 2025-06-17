import axios from 'axios';
import { ICellIssue } from './types';

/**
 * Builds an enhanced prompt for generating image alt text
 */
function buildImageAltPrompt(content: string, context: string): string {
  return `You are an accessibility expert creating alt text for images in Jupyter notebooks.

TASK: Generate concise, descriptive alt text for the image referenced in this code.

GUIDELINES:
- Focus on the image content and purpose, not the fact it's an image
- Keep it under 125 characters
- Describe what's visually important for understanding
- If it's a chart/graph, include key data insights
- If decorative, respond with "decorative"
- Don't start with "Image of" or "Picture showing"

CONTEXT: ${context}

CODE:
${content}

OUTPUT FORMAT:
- Respond with ONLY the alt text
- No quotation marks or explanations
- Maximum 125 characters

Alt text:`;
}

/**
 * Gets contextual information about the cell content
 */
function getImageContext(issue: ICellIssue): string {
  const content = issue.issueContentRaw.toLowerCase();
  const cellType = issue.cellType || 'code';
  
  if (content.includes('plt.') || content.includes('matplotlib') || content.includes('pyplot')) {
    return 'Matplotlib plot in Jupyter notebook - focus on chart type and key insights';
  }
  if (content.includes('plotly') || content.includes('px.')) {
    return 'Plotly visualization in Jupyter notebook - describe the chart and main data patterns';
  }
  if (content.includes('seaborn') || content.includes('sns.')) {
    return 'Seaborn statistical plot in Jupyter notebook - highlight statistical insights';
  }
  if (content.includes('.png') || content.includes('.jpg') || content.includes('.jpeg') || content.includes('.svg')) {
    return 'Static image file in Jupyter notebook - describe visual content and purpose';
  }
  
  return `${cellType} cell in Jupyter notebook containing image reference`;
}

/**
 * Validates and formats the alt text response
 */
function validateAltText(response: string): string {
  let cleaned = response.trim();
  
  // Remove common unwanted prefixes
  const unwantedPrefixes = ['alt text:', 'alt:', 'description:', 'image:', 'picture:', '"', "'"];
  for (const prefix of unwantedPrefixes) {
    if (cleaned.toLowerCase().startsWith(prefix)) {
      cleaned = cleaned.substring(prefix.length).trim();
    }
  }
  
  // Remove quotes
  cleaned = cleaned.replace(/^["']|["']$/g, '');
  
  // Truncate if too long
  if (cleaned.length > 125) {
    cleaned = cleaned.substring(0, 122) + '...';
  }
  
  return cleaned || 'Image';
}

export async function getImageAltSuggestion(
  issue: ICellIssue,
  userURL: string,
  modelName: string
): Promise<string> {
  const context = getImageContext(issue);
  const prompt = buildImageAltPrompt(issue.issueContentRaw, context);

  try {
    const body = JSON.stringify({
      model: modelName,
      prompt: prompt,
      stream: false
    });

    console.log('Sending request to:', userURL + 'api/generate');
    const response = await axios.post(userURL + 'api/generate', body, {
      headers: { 'Content-Type': 'application/json' }
    });
    const responseText = await response.data.response.trim();
    return validateAltText(responseText);
  } catch (error) {
    console.error('Error getting image alt suggestions:', error);
    return 'Error generating alt text';
  }
}

/**
 * Builds an enhanced prompt for generating table captions
 */
function buildTableCaptionPrompt(content: string, context: string): string {
  return `You are an accessibility expert creating table captions for data tables.

TASK: Generate a clear, informative caption that summarizes the table's purpose and structure.

GUIDELINES:
- Start with what the table shows (data type, topic)
- Mention key dimensions (rows, columns, categories)
- Include date range or scope if apparent
- Keep it 1-2 sentences, under 150 characters
- Focus on helping users understand the table's purpose

CONTEXT: ${context}

HTML TABLE:
${content}

OUTPUT FORMAT:
- Respond with ONLY the table caption
- No quotation marks or explanations
- Maximum 150 characters

Table caption:`;
}

/**
 * Gets contextual information about the table content
 */
function getTableContext(issue: ICellIssue): string {
  const content = issue.issueContentRaw.toLowerCase();
  const cellType = issue.cellType || 'code';
  
  if (content.includes('dataframe') || content.includes('df.')) {
    return 'Pandas DataFrame displayed as HTML table in Jupyter notebook';
  }
  if (content.includes('summary') || content.includes('describe')) {
    return 'Statistical summary table in Jupyter notebook';
  }
  if (content.includes('pivot') || content.includes('crosstab')) {
    return 'Pivot/cross-tabulation table in Jupyter notebook';
  }
  if (content.includes('<th>') && content.includes('<td>')) {
    return 'Data table with headers in Jupyter notebook';
  }
  
  return `${cellType} cell containing data table in Jupyter notebook`;
}

/**
 * Validates and formats the table caption response
 */
function validateTableCaption(response: string): string {
  let cleaned = response.trim();
  
  // Remove common unwanted prefixes
  const unwantedPrefixes = ['table caption:', 'caption:', 'description:', 'table:', '"', "'"];
  for (const prefix of unwantedPrefixes) {
    if (cleaned.toLowerCase().startsWith(prefix)) {
      cleaned = cleaned.substring(prefix.length).trim();
    }
  }
  
  // Remove quotes
  cleaned = cleaned.replace(/^["']|["']$/g, '');
  
  // Ensure it starts with capital letter
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  
  // Truncate if too long
  if (cleaned.length > 150) {
    cleaned = cleaned.substring(0, 147) + '...';
  }
  
  return cleaned || 'Data table';
}

export async function getTableCaptionSuggestion(
  issue: ICellIssue,
  userURL: string,
  modelName: string
): Promise<string> {
  const context = getTableContext(issue);
  const prompt = buildTableCaptionPrompt(issue.issueContentRaw, context);

  try {
    const body = JSON.stringify({
      model: modelName,
      prompt: prompt,
      stream: false
    });

    const response = await axios.post(userURL + 'api/generate', body, {
      headers: { 'Content-Type': 'application/json' }
    });
    const responseText = await response.data.response.trim();
    return validateTableCaption(responseText);
  } catch (error) {
    console.error('Error getting table caption suggestions:', error);
    return 'Error generating table caption';
  }
}
