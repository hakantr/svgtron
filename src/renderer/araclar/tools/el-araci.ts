import { svg } from 'lit';
import { aracKayitDefteri, type Arac } from '../arac';

/**
 * El aracı (§9.2, Görünüm) — sürükleyerek görünümü kaydırır. Görünüm durumu
 * (İlke 9): belgeyi değiştirmez, undo'ya girmez. (Orta-fare sürüklemesiyle her
 * araçta da kaydırma yapılabilir.)
 */
let son: { x: number; y: number } | null = null;

const elAraci: Arac = {
  id: 'el',
  etiketAnahtari: 'arac.el',
  imlec: 'grab',
  sira: 90,
  ikon: svg`<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
    <path d="M7 2.2c0-.55.45-1 1-1s1 .45 1 1V7h.5V3.2c0-.55.45-1 1-1s1 .45 1 1V8h.5V5c0-.55.45-1 1-1s1 .45 1 1v5.2c0 2.1-1.7 3.8-3.8 3.8H8.4c-1 0-1.95-.4-2.65-1.1L2.4 9.5c-.4-.4-.4-1 0-1.4.4-.4 1-.4 1.45 0L5 9.2V3.5c0-.55.45-1 1-1s1 .45 1 1Z" />
  </svg>`,

  bas(olay) {
    son = { x: olay.clientX, y: olay.clientY };
  },
  surukle(olay, baglam) {
    if (!son) return;
    baglam.gorunumKaydir(olay.clientX - son.x, olay.clientY - son.y);
    son = { x: olay.clientX, y: olay.clientY };
  },
  birak() {
    son = null;
  },
};

aracKayitDefteri.kaydet(elAraci);
