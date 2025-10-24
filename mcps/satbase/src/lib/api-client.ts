import { config } from '../config.js';
import logger from '../logger.js';

export async function callSatbase<T>(
  endpoint: string,
  options?: RequestInit,
  timeout: number = 30000 // Default 30 seconds
): Promise<T> {
  const url = `${config.SATBASE_API_URL}${endpoint}`;
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(id);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ url, status: response.status, errorText }, 'Satbase API call failed');
      throw new Error(`Satbase API error: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<T>;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      logger.error({ url, timeout }, 'Satbase API call timed out');
      throw new Error(`Satbase API call to ${url} timed out after ${timeout / 1000} seconds.`);
    }
    logger.error({ url, error: error.message }, 'Satbase API call failed unexpectedly');
    throw error;
  }
}
