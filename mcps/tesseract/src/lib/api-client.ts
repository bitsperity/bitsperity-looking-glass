import { config } from '../config.js';
import { logger } from '../logger.js';

export class TesseractAPIError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message: string
  ) {
    super(message);
    this.name = 'TesseractAPIError';
  }
}

export async function callTesseract<T>(
  endpoint: string,
  options?: RequestInit & { timeout?: number }
): Promise<T> {
  const url = `${config.TESSERACT_API_URL}${endpoint}`;
  const timeout = options?.timeout || 30000; // 30s default

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    logger.debug({ url, method: options?.method || 'GET' }, 'Calling Tesseract API');

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new TesseractAPIError(
        response.status,
        response.statusText,
        `Tesseract API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();
    logger.debug({ url, status: response.status }, 'Tesseract API response received');
    return data as T;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof TesseractAPIError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Tesseract API timeout after ${timeout}ms: ${url}`);
    }

    throw new Error(`Tesseract API call failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

