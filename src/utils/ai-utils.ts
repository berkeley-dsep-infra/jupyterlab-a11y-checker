import axios from 'axios';
import { ICellIssue } from './types';

export function formatPrompt(issue: ICellIssue): string {
  let prompt =
    'The following represents a jupyter notebook cell and a accessibility issue found in it.\n\n';
  const cellIssue = issue;
  prompt += `Content: \n${cellIssue.issueContentRaw}\n\n`;
  prompt += `Issue: ${cellIssue.violation.id}\n\n`;
  prompt += `Description: ${cellIssue.violation.description}\n\n`;

  prompt += `Respond in JSON format with the following fields:
    - exampleCellContent: A suggested fix for the cell, without any explanation.
    `;

  return prompt;
}

export async function getFixSuggestions(
  prompt: string,
  userURL: string,
  modelName: string
): Promise<string> {
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
    const responseObj = JSON.parse(responseText);
    console.log(responseText);
    try {
      return responseObj.exampleCellContent;
    } catch (e) {
      console.error('Failed to parse suggestion:', e);
      return 'Invalid response format';
    }
  } catch (error) {
    console.error('Error getting suggestions:', error);
    return 'Error';
  }
}

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

export async function pullOllamaModel(
  userURL: string,
  modelName: string
): Promise<void> {
  try {
    const payload = {
      name: modelName,
      stream: false,
      options: {
        low_cpu_mem_usage: true,
        use_fast_tokenizer: true
      }
    };

    // Instead of aborting, let's just monitor the time
    console.log('Starting model pull...');

    const response = await axios.post(userURL + 'api/pull', payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.status !== 200) {
      throw new Error('Failed to pull model');
    }
  } catch (error) {
    console.error('Error pulling model:', error);
    throw error;
  }
}
