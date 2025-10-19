import { apiGet } from './client';

export async function usdToBtc(value: number, on: string) {
  return await apiGet<{ btc: number }>(`/v1/convert/usd-to-btc?value=${value}&on=${on}`);
}

export async function btcToUsd(value: number, on: string) {
  return await apiGet<{ usd: number }>(`/v1/convert/btc-to-usd?value=${value}&on=${on}`);
}

