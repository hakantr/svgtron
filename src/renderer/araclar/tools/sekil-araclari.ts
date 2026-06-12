import { svg } from 'lit';
import { aracKayitDefteri } from '../arac';
import { cizimAraci } from '../cizim-araci';
import { say } from '../../tuval/donusum';
import type { TuvalNoktasi } from '../arac';

/** Çizim araçları (§9.2 [ARAÇ]): dikdörtgen, elips, çizgi, metin. */

aracKayitDefteri.kaydet(
  cizimAraci({
    id: 'dikdortgen',
    etiketAnahtari: 'arac.dikdortgen',
    sira: 10,
    svgEtiket: 'rect',
    varsayilan: { fill: '#4a90e2' },
    ikon: svg`<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2.5" y="4" width="11" height="8" rx="1"/></svg>`,
    geometri(bas: TuvalNoktasi, simdi: TuvalNoktasi, oranli: boolean) {
      let w = simdi.x - bas.x;
      let h = simdi.y - bas.y;
      if (oranli) {
        const k = Math.max(Math.abs(w), Math.abs(h));
        w = Math.sign(w || 1) * k;
        h = Math.sign(h || 1) * k;
      }
      return {
        x: String(say(Math.min(bas.x, bas.x + w))),
        y: String(say(Math.min(bas.y, bas.y + h))),
        width: String(say(Math.abs(w))),
        height: String(say(Math.abs(h))),
      };
    },
  }),
);

aracKayitDefteri.kaydet(
  cizimAraci({
    id: 'elips',
    etiketAnahtari: 'arac.elips',
    sira: 11,
    svgEtiket: 'ellipse',
    varsayilan: { fill: '#10b981' },
    ikon: svg`<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4"><ellipse cx="8" cy="8" rx="6" ry="4.5"/></svg>`,
    geometri(bas, simdi, oranli) {
      let rx = Math.abs(simdi.x - bas.x) / 2;
      let ry = Math.abs(simdi.y - bas.y) / 2;
      if (oranli) rx = ry = Math.max(rx, ry);
      return {
        cx: String(say((bas.x + simdi.x) / 2)),
        cy: String(say((bas.y + simdi.y) / 2)),
        rx: String(say(rx)),
        ry: String(say(ry)),
      };
    },
  }),
);

aracKayitDefteri.kaydet(
  cizimAraci({
    id: 'cizgi',
    etiketAnahtari: 'arac.cizgi',
    sira: 12,
    svgEtiket: 'line',
    varsayilan: { fill: 'none', stroke: '#1f2937', 'stroke-width': '2', 'stroke-linecap': 'round' },
    ikon: svg`<svg viewBox="0 0 16 16" width="16" height="16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 13 L13 3"/></svg>`,
    geometri(bas, simdi) {
      return {
        x1: String(say(bas.x)),
        y1: String(say(bas.y)),
        x2: String(say(simdi.x)),
        y2: String(say(simdi.y)),
      };
    },
  }),
);

aracKayitDefteri.kaydet(
  cizimAraci({
    id: 'metin',
    etiketAnahtari: 'arac.metin',
    sira: 13,
    svgEtiket: 'text',
    varsayilan: { fill: '#1f2937', 'font-family': 'system-ui, sans-serif', 'font-size': '24' },
    metin: 'Metin',
    tikKur: true,
    ikon: svg`<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M3 3 H13 V5 H9 V13 H7 V5 H3 Z"/></svg>`,
    geometri(bas) {
      return { x: String(say(bas.x)), y: String(say(bas.y)) };
    },
  }),
);
