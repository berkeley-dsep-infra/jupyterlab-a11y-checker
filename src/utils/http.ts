import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

interface IGuardedAxiosRequestConfig extends AxiosRequestConfig {
  /** Optional byte limit for data: URLs. Defaults to 10 MiB. */
  maxDataUrlBytes?: number;
}

function getDataUrlPayloadBytes(dataUrl: string): number {
  // data:[<mediatype>][;base64],<data>
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) {
    return 0;
  }
  const header = dataUrl.substring(0, commaIdx).toLowerCase();
  const payload = dataUrl.substring(commaIdx + 1);

  if (header.includes(';base64')) {
    // Base64 size: 3/4 of length, minus padding
    const len = payload.length;
    const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
    return Math.floor((len * 3) / 4) - padding;
  }

  // URL-encoded payload; approximate by decoding length
  try {
    return decodeURIComponent(payload).length;
  } catch {
    return payload.length;
  }
}

function enforceDataUrlLimit(
  url?: string,
  cfg?: IGuardedAxiosRequestConfig
): void {
  if (!url) {
    return;
  }
  if (url.startsWith('data:')) {
    const limit = cfg?.maxDataUrlBytes ?? 10 * 1024 * 1024; // 10 MiB default
    const size = getDataUrlPayloadBytes(url);
    if (size > limit) {
      throw new Error(
        `Data URL exceeds limit (${size} bytes > ${limit} bytes)`
      );
    }
  }
}

export async function get<T = any, R = AxiosResponse<T>>(
  url: string,
  config?: IGuardedAxiosRequestConfig
): Promise<R> {
  enforceDataUrlLimit(url, config);
  return axios.get(url, config) as unknown as Promise<R>;
}

export async function post<T = any, R = AxiosResponse<T>>(
  url: string,
  data?: any,
  config?: IGuardedAxiosRequestConfig
): Promise<R> {
  enforceDataUrlLimit(url, config);
  return axios.post(url, data, config) as unknown as Promise<R>;
}

export const http = { get, post };

export type { IGuardedAxiosRequestConfig };
