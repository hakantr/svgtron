import type { KopruApi } from '../ortak/api-sozlesmesi';

/**
 * preload köprüsünün renderer'a açtığı `window.api` yüzeyini tiplere bildirir.
 * Böylece renderer kodu, sözleşmeyi (api-sozlesmesi.ts) tek kaynak olarak
 * kullanıp tip güvenli kalır.
 */
declare global {
  interface Window {
    readonly api: KopruApi;
  }
}

export {};
