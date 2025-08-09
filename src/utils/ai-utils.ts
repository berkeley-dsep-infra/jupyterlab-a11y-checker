import axios from 'axios';
import { ICellIssue } from './types';

export interface IModelSettings {
  baseUrl: string;
  apiKey: string;
  model: string;
}

async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  /**
   * Function that fetches image from url, converts to JPEG, and returns in base64 format.
   * Similar to the Python convert_to_jpeg_base64 function in your notebook.
   */

  const response = await axios.get(imageUrl, { responseType: 'blob' });
  const imageBlob = response.data;

  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      // Create canvas and draw image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Set canvas size to image size
      canvas.width = img.width;
      canvas.height = img.height;

      // If image has transparency, fill with white background first
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw the image on canvas
      ctx.drawImage(img, 0, 0);

      // Convert to JPEG base64 (quality 95% like in the Python example)
      const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.95);

      // Extract just the base64 part (remove "data:image/jpeg;base64,")
      const base64String = jpegDataUrl.split(',')[1];
      resolve(base64String);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Create object URL from blob and load it
    const objectUrl = URL.createObjectURL(imageBlob);
    img.src = objectUrl;
  });
}

export async function getImageAltSuggestion(
  issue: ICellIssue,
  imageData: string,
  visionSettings: IModelSettings
): Promise<string> {
  let prompt =
    'Read the provided image and respond with a short description of the image, without any explanation. Avoid using the word "image" in the description.';
  prompt += `Content: \n${issue.issueContentRaw}\n\n`;

  // New River implementation - using OpenAI Chat Completions API format
  console.log('visionSettings', visionSettings);
  console.log('imageData', imageData);
  try {
    const imageUrl = imageData.startsWith('data:image')
      ? imageData
      : `data:image/jpeg;base64,${await fetchImageAsBase64(imageData)}`;

    const body = JSON.stringify({
      model: visionSettings.model,
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that generates alt text for images.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      max_tokens: 150
    });

    console.log('Sending request to:', visionSettings.baseUrl);
    console.log('Body:', body);
    const response = await axios.post(visionSettings.baseUrl, body, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${visionSettings.apiKey}`
      }
    });

    // Parse response using OpenAI Chat Completions format
    if (
      response.data.choices &&
      response.data.choices[0] &&
      response.data.choices[0].message
    ) {
      const responseText = response.data.choices[0].message.content;
      return responseText ? responseText.trim() : 'No content in response';
    } else {
      console.error('Unexpected response structure:', response.data);
      return 'Error parsing response';
    }
  } catch (error) {
    console.error('Error getting suggestions:', error);
    return 'Error';
  }
}

export async function getTableCaptionSuggestion(
  issue: ICellIssue,
  languageSettings: IModelSettings
): Promise<string> {
  const prompt = `Given this HTML table, please respond with a short description of the table, without any explanation. Here's the table:
    ${issue.issueContentRaw}`;

  // New River implementation - using OpenAI Chat Completions API format
  try {
    const body = JSON.stringify({
      model: languageSettings.model,
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that generates captions for HTML tables.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 150
    });

    console.log('Sending request to:', languageSettings.baseUrl);
    const response = await axios.post(languageSettings.baseUrl, body, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${languageSettings.apiKey}`
      }
    });

    // Parse response using OpenAI Chat Completions format
    if (
      response.data.choices &&
      response.data.choices[0] &&
      response.data.choices[0].message
    ) {
      const responseText = response.data.choices[0].message.content;
      return responseText ? responseText.trim() : 'No content in response';
    } else {
      console.error('Unexpected response structure:', response.data);
      return 'Error parsing response';
    }
  } catch (error) {
    console.error('Error getting suggestions:', error);
    return 'Error';
  }
}
