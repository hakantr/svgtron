import { svg } from 'lit';
import { aracKayitDefteri, type Arac, type AracBaglami } from '../arac';
import type { Dugum } from '../../../cekirdek/belge/model/dugum';
import { cizimErisimi } from '../../tuval/cizim-erisimi';
import {
  dugumCokPoligonu,
  atomikYuzler,
  yuzleriBirlestir,
  sonucuYaz,
  belgeSirasi,
  MAKS_ATOMIK_OPERAND,
} from '../../ozellikler/yol-islemleri/bool';
import { cokPoligonuD, type CokPoligon, type Cift } from '../../ozellikler/yol-islemleri/bool-geometri';

const SVG_NS = 'http://www.w3.org/2000/svg';
const ACCENT = 'var(--vurgu, #4a90e2)';

interface Yuz {
  cp: CokPoligon; // kök kullanıcı uzayında atomik yüz
  tut: boolean; // sonuca dâhil mi?
  el: SVGPathElement;
}

// --- Tekil araç durumu ---
let baglamRef: AracBaglami | null = null;
let secimCoz: (() => void) | null = null;
let kat: SVGSVGElement | null = null;
let operandlar: Dugum[] = []; // kaynak şekiller (alttan üste)
let yuzler: Yuz[] = [];
let hoverIdx = -1;

function katmaniKur(baglam: AracBaglami): void {
  const kap = baglam.aracKatmani();
  kat = document.createElementNS(SVG_NS, 'svg');
  Object.assign(kat.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    overflow: 'visible',
    pointerEvents: 'none',
  });
  kap.appendChild(kat);
}

function temizle(): void {
  kat?.replaceChildren();
  yuzler = [];
  operandlar = [];
  hoverIdx = -1;
}

function stilUygula(y: Yuz, i: number): void {
  const hover = i === hoverIdx;
  y.el.style.fill = ACCENT;
  y.el.style.fillOpacity = y.tut ? (hover ? '0.42' : '0.28') : hover ? '0.14' : '0.05';
  y.el.style.stroke = ACCENT;
  y.el.setAttribute('stroke-width', hover ? '2' : '1');
  y.el.style.strokeOpacity = y.tut ? '0.9' : '0.55';
  y.el.setAttribute('stroke-dasharray', y.tut ? '' : '4 3');
}

/** Seçili (≥2 geçerli) şekilden atomik yüzleri kurar; <2 ise temizler. */
function yenidenKur(): void {
  if (!baglamRef || !kat) return;
  kat.replaceChildren();
  yuzler = [];
  operandlar = [];
  hoverIdx = -1;

  const belge = baglamRef.depo.belge;
  if (!belge) return;
  const sira = belgeSirasi(belge.kok);
  const aday = [...baglamRef.secim.secililer].sort(
    (a, b) => (sira.get(a.kimlik) ?? 0) - (sira.get(b.kimlik) ?? 0),
  );

  const kokInv = baglamRef.kok?.getScreenCTM()?.inverse() ?? null;
  const gecerli: { d: Dugum; cp: CokPoligon }[] = [];
  for (const d of aday) {
    const el = cizimErisimi.eleman(d.kimlik);
    const cp = el ? dugumCokPoligonu(d, el, kokInv) : null;
    if (cp && cp.length) gecerli.push({ d, cp });
  }
  // atomikYuzler N'i MAKS_ATOMIK_OPERAND ile sınırlar; operandları da AYNI sınıra
  // çek. Aksi halde uygula() fazla operandları siler ama geometrileri sonuca
  // girmez → sessiz veri kaybı. Cap aşılırsa kullanıcıyı uyar (alttan üste ilk N).
  if (gecerli.length > MAKS_ATOMIK_OPERAND) {
    console.warn(
      `Şekil Oluşturucu en çok ${MAKS_ATOMIK_OPERAND} şekil işler; ` +
        `alttan üste ilk ${MAKS_ATOMIK_OPERAND}'i kullanılıyor.`,
    );
  }
  const secili = gecerli.slice(0, MAKS_ATOMIK_OPERAND);
  operandlar = secili.map((g) => g.d);
  const geoms: CokPoligon[] = secili.map((g) => g.cp);
  if (operandlar.length < 2) {
    operandlar = [];
    return;
  }

  const atomik = atomikYuzler(geoms);
  yuzler = atomik.map((cp) => {
    const el = document.createElementNS(SVG_NS, 'path') as SVGPathElement;
    el.style.pointerEvents = 'auto';
    el.style.cursor = 'pointer';
    el.style.strokeLinejoin = 'round';
    const yuz: Yuz = { cp, tut: true, el };
    el.addEventListener('pointerenter', () => {
      hoverIdx = yuzler.indexOf(yuz);
      yuzler.forEach(stilUygula);
    });
    el.addEventListener('pointerleave', () => {
      if (hoverIdx === yuzler.indexOf(yuz)) hoverIdx = -1;
      yuzler.forEach(stilUygula);
    });
    el.addEventListener('pointerdown', (o) => {
      o.preventDefault();
      o.stopPropagation();
      yuz.tut = !yuz.tut; // dâhil/çıkar
      yuzler.forEach(stilUygula);
    });
    kat!.appendChild(el);
    return yuz;
  });
  yerlestir();
}

/** Yüzleri kök CTM ile ekran-koordinatına yerleştirir + stilini uygular. */
function yerlestir(): void {
  if (!kat || !baglamRef || yuzler.length === 0) return;
  const kok = baglamRef.kok;
  const ctm = kok?.getScreenCTM();
  if (!kok || !ctm) return;
  const orijin = kat.getBoundingClientRect();
  const yerel = (cp: CokPoligon): CokPoligon =>
    cp.map((poly) =>
      poly.map((halka) =>
        halka.map(([x, y]): Cift => {
          const sp = new DOMPoint(x, y).matrixTransform(ctm);
          return [sp.x - orijin.left, sp.y - orijin.top];
        }),
      ),
    );
  yuzler.forEach((y, i) => {
    y.el.setAttribute('d', cokPoligonuD(yerel(y.cp)));
    stilUygula(y, i);
  });
}

function uygula(): void {
  if (!baglamRef) return;
  const belge = baglamRef.depo.belge;
  if (!belge || operandlar.length < 2) return;
  const tutulan = yuzler.filter((y) => y.tut).map((y) => y.cp);
  if (tutulan.length === 0) return;
  const d = cokPoligonuD(yuzleriBirlestir(tutulan));
  if (!d) return;
  sonucuYaz(belge, baglamRef.secim, baglamRef.gecmis, operandlar, d, 'şekil oluştur');
  // Commit sonrası seçim tek path olur → secim.dinle → yenidenKur → yüzler temizlenir.
}

/**
 * Şekil Oluşturucu (§9.2, §11.6 2. dalga) — seçili örtüşen şekillerin oluşturduğu
 * **atomik bölgeleri** gösterir; her bölgeye tıklamak onu sonuca dâhil eder/çıkarır
 * (başta hepsi dâhil → birleşim; ortadakini çıkarınca delik oluşur). Enter sonucu
 * tek `<path>` yapar (operandları değiştirir, tek Command); Esc tümünü geri dâhil eder.
 */
const sekilOlusturucu: Arac = {
  id: 'sekil-olusturucu',
  etiketAnahtari: 'arac.sekilOlusturucu',
  imlec: 'pointer',
  sira: 2,
  tutamacGizle: true,
  ikon: svg`<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.2">
    <circle cx="6.2" cy="8" r="4" />
    <circle cx="9.8" cy="8" r="4" fill="currentColor" fill-opacity="0.35" />
  </svg>`,

  etkinlesti(baglam) {
    baglamRef = baglam;
    katmaniKur(baglam);
    secimCoz = baglam.secim.dinle(() => yenidenKur());
    yenidenKur();
  },

  konumla(baglam) {
    baglamRef = baglam;
    if (yuzler.length) yerlestir();
  },

  tus(olay) {
    if (olay.key === 'Enter') {
      olay.preventDefault();
      uygula();
    } else if (olay.key === 'Escape') {
      olay.preventDefault();
      yuzler.forEach((y) => (y.tut = true));
      yuzler.forEach(stilUygula);
    }
  },

  pasiflesti() {
    secimCoz?.();
    secimCoz = null;
    temizle();
    kat?.remove();
    kat = null;
    baglamRef = null;
  },
};

aracKayitDefteri.kaydet(sekilOlusturucu);
