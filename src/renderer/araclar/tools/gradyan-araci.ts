import { svg } from "lit";
import { aracKayitDefteri, type Arac, type AracBaglami } from "../arac";
import type { Dugum } from "../../../cekirdek/belge/model/dugum";
import { OznitelikDegistirKomutu } from "../../../cekirdek/komutlar/oznitelik-degistir-komutu";
import { say } from "../../tuval/donusum";
import { urlId, gradyanBul } from "../../boya/gradyan-model";
import { noktaOfset, ofsetNokta, type Nokta } from "../../boya/gradyan-geometri";

const SVG_NS = "http://www.w3.org/2000/svg";
const ACCENT = "var(--vurgu, #4a90e2)";

/**
 * Gradyan aracı (TK-37 #3) — seçili nesnenin DOĞRUSAL gradyan dolgusunun
 * uç noktalarını ve duraklarını TUVAL üzerinde sürükleyerek düzenler.
 *
 * Aynı kaynak düğümünü (defs'teki `<linearGradient>`) değiştirir → Tanımlar paneli/
 * boya seçici düzenleyicisini TAMAMLAR (İlke 3 ile ikisi de canlı güncellenir).
 * Saf geometri `gradyan-geometri.ts`'de (testli); koordinat eşlemesi getBBox+CTM ile
 * (objectBoundingBox / userSpaceOnUse korunur — İlke 8, TK-37 #3). Sürükleme bırakınca
 * tek Command (İlke 2). [GÖRSEL — gözle teyit gerekir; §5.]
 *
 * Sınır (v1): radyal gradyan bu araçla düzenlenmez (Tanımlar paneli/boya seçici kullanılır).
 */

let baglamRef: AracBaglami | null = null;
let secimCoz: (() => void) | null = null;
let depoCoz: (() => void) | null = null;
let kat: SVGSVGElement | null = null;
let aktifNesne: Dugum | null = null;
let aktifGradyan: Dugum | null = null;

interface Tutamac {
  /** 'p1'/'p2' = uç; sayı = durak indeksi. */
  tip: "p1" | "p2" | number;
  el: SVGElement;
}
let cizgi: SVGLineElement | null = null;
let tutamaclar: Tutamac[] = [];

// Sürükleme durumu (mutlak — birikme yok).
let surukle: { tip: "p1" | "p2" | number } | null = null;

// --- Gradyan okuma ---

function obbMi(g: Dugum): boolean {
  return (g.oznitelikler.get("gradientUnits") ?? "objectBoundingBox") !==
    "userSpaceOnUse";
}

/** Gradyan koordinat değerini çözer (% → oran; objectBoundingBox'ta varsayılan verilir). */
function koord(g: Dugum, ad: string, varsayilan: number): number {
  const ham = g.oznitelikler.get(ad);
  if (ham == null) return varsayilan;
  const t = ham.trim();
  const n = t.endsWith("%") ? Number(t.slice(0, -1)) / 100 : Number(t);
  return Number.isFinite(n) ? n : varsayilan;
}

function uclar(g: Dugum): { p1: Nokta; p2: Nokta } {
  return {
    p1: { x: koord(g, "x1", 0), y: koord(g, "y1", 0) },
    p2: { x: koord(g, "x2", 1), y: koord(g, "y2", 0) },
  };
}

function duraklar(g: Dugum): Dugum[] {
  return g.cocuklar.filter((c) => c.etiket === "stop");
}

function durakOfset(s: Dugum): number {
  const t = (s.oznitelikler.get("offset") ?? "0").trim();
  const n = t.endsWith("%") ? Number(t.slice(0, -1)) / 100 : Number(t);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
}

/** Seçili nesnenin doğrusal gradyan dolgusunu (varsa) bulur. */
function aktifGradyaniBul(baglam: AracBaglami): {
  nesne: Dugum;
  gradyan: Dugum;
} | null {
  const sec = baglam.secim.secililer;
  if (sec.length !== 1) return null;
  const nesne = sec[0]!;
  const el = baglam.eleman(nesne.kimlik);
  const fill =
    (el instanceof SVGElement ? getComputedStyle(el).fill : "") ||
    nesne.oznitelikler.get("fill") ||
    "";
  const id = urlId(fill);
  const belge = baglam.depo.belge;
  if (!id || !belge) return null;
  const g = gradyanBul(belge, id);
  if (!g || g.etiket !== "linearGradient") return null;
  return { nesne, gradyan: g };
}

// --- Koordinat eşlemesi (gradyan ↔ ekran) ---

interface Esleme {
  ctm: DOMMatrix;
  bbox: { x: number; y: number; width: number; height: number };
  obb: boolean;
  orijin: DOMRect;
}

function eslemeKur(): Esleme | null {
  if (!kat || !aktifNesne || !aktifGradyan || !baglamRef) return null;
  const el = baglamRef.eleman(aktifNesne.kimlik);
  if (!(el instanceof SVGGraphicsElement)) return null;
  const ctm = el.getScreenCTM();
  if (!ctm) return null;
  return {
    ctm,
    bbox: el.getBBox(),
    obb: obbMi(aktifGradyan),
    orijin: kat.getBoundingClientRect(),
  };
}

/** Gradyan koord → ekran (kat'a göre). */
function gradEkran(p: Nokta, e: Esleme): Nokta {
  const yerel = e.obb
    ? { x: e.bbox.x + p.x * e.bbox.width, y: e.bbox.y + p.y * e.bbox.height }
    : p;
  const sp = new DOMPoint(yerel.x, yerel.y).matrixTransform(e.ctm);
  return { x: sp.x - e.orijin.left, y: sp.y - e.orijin.top };
}

/** Ekran (kat'a göre) → gradyan koord. */
function ekranGrad(sx: number, sy: number, e: Esleme): Nokta {
  const yerel = new DOMPoint(
    sx + e.orijin.left,
    sy + e.orijin.top,
  ).matrixTransform(e.ctm.inverse());
  if (!e.obb) return { x: yerel.x, y: yerel.y };
  return {
    x: e.bbox.width ? (yerel.x - e.bbox.x) / e.bbox.width : 0,
    y: e.bbox.height ? (yerel.y - e.bbox.y) / e.bbox.height : 0,
  };
}

// --- Overlay ---

function katmaniKur(baglam: AracBaglami): void {
  kat = document.createElementNS(SVG_NS, "svg");
  Object.assign(kat.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    overflow: "visible",
    pointerEvents: "none",
  });
  baglam.aracKatmani().appendChild(kat);
}

function imleriKur(): void {
  kat?.replaceChildren();
  cizgi = null;
  tutamaclar = [];
  if (!kat || !aktifGradyan) return;

  cizgi = document.createElementNS(SVG_NS, "line");
  cizgi.style.stroke = ACCENT;
  cizgi.setAttribute("stroke-width", "1.5");
  cizgi.style.opacity = "0.8";
  cizgi.style.pointerEvents = "none";
  kat.appendChild(cizgi);

  // Uç tutamaçları (kare).
  for (const tip of ["p1", "p2"] as const) {
    const r = document.createElementNS(SVG_NS, "rect");
    r.setAttribute("width", "9");
    r.setAttribute("height", "9");
    r.setAttribute("rx", "1.5");
    r.style.fill = ACCENT;
    r.setAttribute("stroke", "#fff");
    r.setAttribute("stroke-width", "1.5");
    r.style.pointerEvents = "auto";
    r.style.cursor = "move";
    r.addEventListener("pointerdown", (o) => surukleBasla(tip, o));
    kat.appendChild(r);
    tutamaclar.push({ tip, el: r });
  }
  // Durak tutamaçları (renkli daire).
  duraklar(aktifGradyan).forEach((s, i) => {
    const c = document.createElementNS(SVG_NS, "circle");
    c.setAttribute("r", "6");
    c.setAttribute("fill", s.oznitelikler.get("stop-color") ?? "#000");
    c.setAttribute("stroke", "#fff");
    c.setAttribute("stroke-width", "2");
    c.style.pointerEvents = "auto";
    c.style.cursor = "ew-resize";
    c.addEventListener("pointerdown", (o) => surukleBasla(i, o));
    kat!.appendChild(c);
    tutamaclar.push({ tip: i, el: c });
  });
  yerlestir();
}

function yerlestir(): void {
  if (!kat || !aktifGradyan) return;
  const e = eslemeKur();
  if (!e) return;
  const { p1, p2 } = uclar(aktifGradyan);
  const s1 = gradEkran(p1, e);
  const s2 = gradEkran(p2, e);
  if (cizgi) {
    cizgi.setAttribute("x1", String(s1.x));
    cizgi.setAttribute("y1", String(s1.y));
    cizgi.setAttribute("x2", String(s2.x));
    cizgi.setAttribute("y2", String(s2.y));
  }
  const stoplar = duraklar(aktifGradyan);
  for (const tm of tutamaclar) {
    if (tm.tip === "p1" || tm.tip === "p2") {
      const p = tm.tip === "p1" ? s1 : s2;
      tm.el.setAttribute("x", String(p.x - 4.5));
      tm.el.setAttribute("y", String(p.y - 4.5));
    } else {
      const s = stoplar[tm.tip];
      if (!s) continue;
      const pt = gradEkran(ofsetNokta(durakOfset(s), p1, p2), e);
      tm.el.setAttribute("cx", String(pt.x));
      tm.el.setAttribute("cy", String(pt.y));
    }
  }
}

// --- Sürükleme ---

function surukleBasla(tip: "p1" | "p2" | number, olay: PointerEvent): void {
  olay.preventDefault();
  olay.stopPropagation();
  surukle = { tip };
  (olay.target as Element).setPointerCapture?.(olay.pointerId);
  window.addEventListener("pointermove", surukleHareket);
  window.addEventListener("pointerup", surukleBirak);
}

function surukleHareket(olay: PointerEvent): void {
  if (!surukle || !kat || !aktifGradyan || !baglamRef) return;
  const e = eslemeKur();
  if (!e) return;
  const orijin = kat.getBoundingClientRect();
  const sx = olay.clientX - orijin.left;
  const sy = olay.clientY - orijin.top;

  if (surukle.tip === "p1" || surukle.tip === "p2") {
    const g = ekranGrad(sx, sy, e);
    const ek = surukle.tip === "p1" ? "1" : "2";
    // Canlı önizleme: model değişmeden gradyan node DOM'una yaz (bırakınca Command).
    const gradEl = baglamRef.eleman(aktifGradyan.kimlik);
    gradEl?.setAttribute(`x${ek}`, String(say(g.x)));
    gradEl?.setAttribute(`y${ek}`, String(say(g.y)));
  } else {
    const { p1, p2 } = uclar(aktifGradyan);
    const off = noktaOfset(
      ekranGrad(sx, sy, e),
      p1,
      p2,
    );
    const s = duraklar(aktifGradyan)[surukle.tip];
    const sEl = s ? baglamRef.eleman(s.kimlik) : null;
    sEl?.setAttribute("offset", String(say(off)));
  }
  yerlestir();
}

function surukleBirak(olay: PointerEvent): void {
  window.removeEventListener("pointermove", surukleHareket);
  window.removeEventListener("pointerup", surukleBirak);
  const s = surukle;
  surukle = null;
  if (!s || !aktifGradyan || !baglamRef) return;
  const belge = baglamRef.depo.belge;
  const e = eslemeKur();
  if (!belge || !e || !kat) return;
  const orijin = kat.getBoundingClientRect();
  const sx = olay.clientX - orijin.left;
  const sy = olay.clientY - orijin.top;

  if (s.tip === "p1" || s.tip === "p2") {
    const g = ekranGrad(sx, sy, e);
    const ek = s.tip === "p1" ? "1" : "2";
    baglamRef.gecmis.calistir(
      new OznitelikDegistirKomutu(belge, aktifGradyan, `x${ek}`, String(say(g.x))),
    );
    baglamRef.gecmis.calistir(
      new OznitelikDegistirKomutu(belge, aktifGradyan, `y${ek}`, String(say(g.y))),
    );
  } else {
    const { p1, p2 } = uclar(aktifGradyan);
    const off = noktaOfset(ekranGrad(sx, sy, e), p1, p2);
    const durak = duraklar(aktifGradyan)[s.tip];
    if (durak)
      baglamRef.gecmis.calistir(
        new OznitelikDegistirKomutu(belge, durak, "offset", String(say(off))),
      );
  }
}

// --- Senkron ---

function senkronla(): void {
  if (!baglamRef) return;
  const bulgu = aktifGradyaniBul(baglamRef);
  aktifNesne = bulgu?.nesne ?? null;
  aktifGradyan = bulgu?.gradyan ?? null;
  imleriKur();
}

const gradyanAraci: Arac = {
  id: "gradyan",
  etiketAnahtari: "arac.gradyan",
  imlec: "default",
  sira: 17,
  tutamacGizle: true,
  ikon: svg`<svg viewBox="0 0 16 16" width="16" height="16"><defs><linearGradient id="gi" x1="0" x2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.2"/><stop offset="1" stop-color="currentColor"/></linearGradient></defs><rect x="2" y="3" width="12" height="10" rx="1.5" fill="url(#gi)" stroke="currentColor" stroke-width="0.8"/></svg>`,

  etkinlesti(baglam) {
    baglamRef = baglam;
    katmaniKur(baglam);
    secimCoz = baglam.secim.dinle(() => senkronla());
    depoCoz = baglam.depo.dinle(() => senkronla());
    senkronla();
  },

  konumla() {
    yerlestir();
  },

  pasiflesti() {
    secimCoz?.();
    depoCoz?.();
    secimCoz = null;
    depoCoz = null;
    window.removeEventListener("pointermove", surukleHareket);
    window.removeEventListener("pointerup", surukleBirak);
    kat?.remove();
    kat = null;
    cizgi = null;
    tutamaclar = [];
    aktifNesne = null;
    aktifGradyan = null;
    surukle = null;
    baglamRef = null;
  },
};

aracKayitDefteri.kaydet(gradyanAraci);
