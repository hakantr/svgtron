import { svg } from "lit";
import { aracKayitDefteri } from "../arac";
import { cizimAraci } from "../cizim-araci";
import { cokNoktaAraci } from "../cok-nokta-araci";
import { yildizNoktalari, spiralYolu } from "../sekil-geometri";

/** Ek çizim araçları (§9.2): Çoklu Çizgi · Çokgen · Yıldız · Spiral. */

aracKayitDefteri.kaydet(
  cokNoktaAraci({
    id: "coklu-cizgi",
    etiketAnahtari: "arac.cokluCizgi",
    sira: 14,
    svgEtiket: "polyline",
    varsayilan: {
      fill: "none",
      stroke: "#1f2937",
      "stroke-width": "2",
      "stroke-linejoin": "round",
    },
    ikon: svg`<svg viewBox="0 0 16 16" width="16" height="16"><polyline points="2,12 6,5 10,10 14,4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><g fill="currentColor"><circle cx="2" cy="12" r="1.5"/><circle cx="6" cy="5" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="14" cy="4" r="1.5"/></g></svg>`,
  }),
);

aracKayitDefteri.kaydet(
  cokNoktaAraci({
    id: "cokgen",
    etiketAnahtari: "arac.cokgen",
    sira: 15,
    svgEtiket: "polygon",
    varsayilan: { fill: "#8b5cf6" },
    ikon: svg`<svg viewBox="0 0 16 16" width="16" height="16"><path d="M8 1.8 L14.2 6.3 L11.8 13.6 L4.2 13.6 L1.8 6.3 Z" fill="currentColor" stroke="none"/></svg>`,
  }),
);

aracKayitDefteri.kaydet(
  cizimAraci({
    id: "yildiz",
    etiketAnahtari: "arac.yildiz",
    sira: 16,
    svgEtiket: "polygon",
    varsayilan: { fill: "#f59e0b" },
    ikon: svg`<svg viewBox="0 0 16 16" width="16" height="16"><path d="M8 1.5 L9.8 6 L14.5 6.2 L10.8 9.2 L12 13.8 L8 11 L4 13.8 L5.2 9.2 L1.5 6.2 L6.2 6 Z" fill="currentColor" stroke="none"/></svg>`,
    geometri(bas, simdi) {
      return { points: yildizNoktalari(bas, simdi) };
    },
  }),
);

aracKayitDefteri.kaydet(
  cizimAraci({
    id: "spiral",
    etiketAnahtari: "arac.spiral",
    sira: 17,
    svgEtiket: "path",
    varsayilan: {
      fill: "none",
      stroke: "#1f2937",
      "stroke-width": "2",
      "stroke-linecap": "round",
    },
    ikon: svg`<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M8 8 a1 1 0 0 1 1.5 0 a2.6 2.6 0 0 1 -1.5 4 a4 4 0 0 1 -4.5 -5.5 a5.6 5.6 0 0 1 8 -1.5"/></svg>`,
    geometri(bas, simdi) {
      return { d: spiralYolu(bas, simdi) };
    },
  }),
);
