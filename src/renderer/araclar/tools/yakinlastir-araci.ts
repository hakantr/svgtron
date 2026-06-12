import { svg } from 'lit';
import { aracKayitDefteri, type Arac } from '../arac';

/**
 * Yakınlaştırma aracı (§9.2, Görünüm) — tıklayınca yakınlaştırır; Alt ile
 * uzaklaştırır. Görünüm durumu (İlke 9). Ayrıca fare tekerleği her araçta
 * yakınlaştırır.
 */
const yakinlastirAraci: Arac = {
  id: 'yakinlastir',
  etiketAnahtari: 'arac.yakinlastir',
  imlec: 'zoom-in',
  sira: 91,
  ikon: svg`<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5">
    <circle cx="7" cy="7" r="4.5" />
    <path d="M10.5 10.5 L14 14 M5 7 H9 M7 5 V9" stroke-linecap="round" />
  </svg>`,

  tikla(olay, baglam) {
    baglam.gorunumYakinlastir(olay.altKey ? 1 / 1.3 : 1.3);
  },
};

aracKayitDefteri.kaydet(yakinlastirAraci);
