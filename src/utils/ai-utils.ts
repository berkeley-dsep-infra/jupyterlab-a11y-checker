import axios from 'axios';
import { ICellIssue } from './types';

export async function getImageAltSuggestion(
  issue: ICellIssue,
  userURL: string,
  modelName: string
): Promise<string> {
  let prompt =
    'Given the following code, read the image url and respond with a short description of the image, without any explanation.';
  prompt += `Content: \n${issue.issueContentRaw}\n\n`;

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
    return responseText;
  } catch (error) {
    console.error('Error getting suggestions:', error);
    return 'Error';
  }
}

export async function getTableCaptionSuggestion(
  issue: ICellIssue,
  userURL: string,
  modelName: string
): Promise<string> {
  const prompt = `Given this HTML table, please respond with a short description of the table, without any explanation. Here's the table:
    ${issue.issueContentRaw}`;

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
    return responseText;
  } catch (error) {
    console.error('Error getting suggestions:', error);
    return 'Error';
  }
}
