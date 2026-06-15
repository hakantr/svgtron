import { svg } from "lit";
import { aracKayitDefteri, type Arac, type AracBaglami } from "../arac";
import type { Dugum } from "../../../cekirdek/belge/model/dugum";
import { OznitelikDegistirKomutu } from "../../../cekirdek/komutlar/oznitelik-degistir-komutu";
import {
  BilesikKomut,
  SekliPathaCevirKomutu,
} from "../../../cekirdek/komutlar/dugum-komutlari";
import {
  yoluAyristir,
  yoluYaz,
  type Segment,
  type Nokta,
} from "../../../cekirdek/belge/model/yol";
import { ekranDeltaKullanici, say } from "../../tuval/donusum";

const SVG_NS = "http://www.w3.org/2000/svg";
const DUZENLENEBILIR = new Set(["path", "polyline", "polygon", "line"]);
const ACCENT = "var(--vurgu, #4a90e2)";

type ModelTip = "path" | "polyline" | "polygon" | "line";
interface Model {
  tip: ModelTip;
  segs: Segment[];
}

/** Bir kontrol/çapa noktasına başvuru (segment indeksi + alan). */
type Alan = "p" | "c1" | "c2" | "c";
interface Ref {
  segIdx: number;
  alan: Alan;
}

// --- Tekil araç durumu ---
let baglamRef: AracBaglami | null = null;
let secimCoz: (() => void) | null = null;
let depoCoz: (() => void) | null = null;
let kat: SVGSVGElement | null = null; // ekran-koordinatlı bindirme svg'i
let seciliDugum: Dugum | null = null;
let model: Model | null = null;
/** Seçili (vurgulanan) düğüm — tıklayınca seçilir; Ctrl+sürükle eğri verir. */
let seciliNokta: Ref | null = null;
/**
 * Press anındaki isabet (Seç aracı gibi) — tıklama çözümü bunu kullanır; release'te
 * YENİDEN isabet etmek, seçimle beliren çapa/tutamaçların üstüne düşüp seçimi siler.
 */
let basHedef: Dugum | null = null;

/**
 * Kavis (Ctrl+sürükle Bézier) verilebilir mi: `path` doğrudan; line/polyline/
 * polygon Ctrl+sürüklenince path'e ÇEVRİLİR (DUZENLENEBILIR kümesi). Düzenlenemeyen
 * şekiller (rect/circle/text…) kavislenemez → "stop" imleci.
 */
function kavisliMi(dugum: Dugum | null): boolean {
  return dugum != null && DUZENLENEBILIR.has(dugum.etiket);
}

interface Im {
  ref: Ref;
  el: SVGElement;
}
interface CizgiIm {
  a: Ref;
  b: Ref;
  el: SVGLineElement;
}
let anchorlar: Im[] = [];
let tutamaclar: Im[] = [];
let cizgiler: CizgiIm[] = [];

// Sürükleme: başlangıç segmentlerinin kopyası + ekran başlangıcı (sürüklemeden
// SONRA mutlak delta uygulanır — birikme/sapma olmaz).
let surukle: {
  ref: Ref;
  basSegs: Segment[];
  basEkran: { x: number; y: number };
  /** Ctrl basılı + path çapası → eğrilik (Bézier kolu) düzenleme modu. */
  egri: boolean;
  /** Ctrl basılı + NON-path (line/polyline/polygon) çapası → path'e çevir + kavis. */
  cevir: boolean;
  /** Çevir modunda geçici kavis önizleme path'i (orijinal gizlenir). */
  onizlemeEl: SVGPathElement | null;
  /** Eşik aşıldı mı (tık ↔ sürükleme ayrımı). */
  tasindi: boolean;
} | null = null;

// --- Geometri yardımcıları ---

function anchorNoktasi(s: Segment): Nokta | null {
  return "p" in s ? s.p : null;
}

function noktaAl(segs: readonly Segment[], ref: Ref): Nokta | null {
  const s = segs[ref.segIdx];
  if (!s) return null;
  if (ref.alan === "p") return anchorNoktasi(s);
  if (ref.alan === "c1" && s.tip === "C") return s.c1;
  if (ref.alan === "c2" && s.tip === "C") return s.c2;
  if (ref.alan === "c" && s.tip === "Q") return s.c;
  return null;
}

function noktaYaz(segs: Segment[], ref: Ref, n: Nokta): void {
  const s = segs[ref.segIdx];
  if (!s) return;
  if (ref.alan === "p" && "p" in s) s.p = n;
  else if (ref.alan === "c1" && s.tip === "C") s.c1 = n;
  else if (ref.alan === "c2" && s.tip === "C") s.c2 = n;
  else if (ref.alan === "c" && s.tip === "Q") s.c = n;
}

function klon(segs: readonly Segment[]): Segment[] {
  return segs.map((s): Segment => {
    switch (s.tip) {
      case "M":
      case "L":
        return { tip: s.tip, p: { ...s.p } };
      case "C":
        return { tip: "C", c1: { ...s.c1 }, c2: { ...s.c2 }, p: { ...s.p } };
      case "Q":
        return { tip: "Q", c: { ...s.c }, p: { ...s.p } };
      case "A":
        return {
          tip: "A",
          rx: s.rx,
          ry: s.ry,
          donus: s.donus,
          buyukYay: s.buyukYay,
          suzme: s.suzme,
          p: { ...s.p },
        };
      case "Z":
        return { tip: "Z" };
    }
  });
}

/** Çapa taşınınca bitişik tutamaçlar (gelen c2, giden c1/c) onunla birlikte taşınır. */
function uygulaDelta(segs: Segment[], ref: Ref, dx: number, dy: number): void {
  const tasi = (n: Nokta): Nokta => ({ x: n.x + dx, y: n.y + dy });
  if (ref.alan !== "p") {
    const p = noktaAl(segs, ref);
    if (p) noktaYaz(segs, ref, tasi(p));
    return;
  }
  const s = segs[ref.segIdx];
  if (!s || !("p" in s)) return;
  noktaYaz(segs, ref, tasi(s.p));
  if (s.tip === "C")
    noktaYaz(segs, { segIdx: ref.segIdx, alan: "c2" }, tasi(s.c2));
  const next = segs[ref.segIdx + 1];
  if (next?.tip === "C")
    noktaYaz(segs, { segIdx: ref.segIdx + 1, alan: "c1" }, tasi(next.c1));
  else if (next?.tip === "Q")
    noktaYaz(segs, { segIdx: ref.segIdx + 1, alan: "c" }, tasi(next.c));
}

/**
 * Ctrl+sürükle: bir çapadan simetrik Bézier kolları çıkarır/ayarlar (yalnız path).
 * Köşe (L) segmentleri C'ye çevrilir; d = çapadan sürükleme vektörü (kullanıcı uzayı).
 * Giden kol (seg i+1) çapanın ileri yönüne, gelen kol (seg i) geri yönüne gider —
 * böylece düğüm "yumuşak" (simetrik) olur ve eğrilik göstergesi (kollar) belirir.
 */
function egriUygula(segs: Segment[], ref: Ref, d: Nokta): void {
  if (ref.alan !== "p") return;
  const i = ref.segIdx;
  const anchor = noktaAl(segs, ref);
  if (!anchor) return;
  const ileri: Nokta = { x: anchor.x + d.x, y: anchor.y + d.y };
  const geri: Nokta = { x: anchor.x - d.x, y: anchor.y - d.y };
  // Giden eğri (seg i+1): çapadan çıkan kol → c1 = ileri.
  const next = segs[i + 1];
  if (next) {
    if (next.tip === "L")
      segs[i + 1] = {
        tip: "C",
        c1: { ...ileri },
        c2: { ...next.p },
        p: { ...next.p },
      };
    else if (next.tip === "C") next.c1 = { ...ileri };
    else if (next.tip === "Q") next.c = { ...ileri };
  }
  // Gelen eğri (seg i): çapaya giren kol → c2 = geri.
  const cur = segs[i];
  if (cur) {
    if (cur.tip === "C") cur.c2 = { ...geri };
    else if (cur.tip === "L") {
      const onceki = noktaAl(segs, { segIdx: i - 1, alan: "p" }) ?? anchor;
      segs[i] = {
        tip: "C",
        c1: { ...onceki },
        c2: { ...geri },
        p: { ...anchor },
      };
    }
  }
}

function sayilar(s: string): number[] {
  return (s.match(/-?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/g) ?? []).map(Number);
}

function modelKur(el: Element): Model | null {
  const tag = el.tagName.toLowerCase();
  if (tag === "path") {
    try {
      return { tip: "path", segs: yoluAyristir(el.getAttribute("d") ?? "") };
    } catch {
      return null;
    }
  }
  if (tag === "polyline" || tag === "polygon") {
    const n = sayilar(el.getAttribute("points") ?? "");
    const pts: Nokta[] = [];
    for (let i = 0; i + 1 < n.length; i += 2)
      pts.push({ x: n[i]!, y: n[i + 1]! });
    if (pts.length === 0) return null;
    const segs: Segment[] = [{ tip: "M", p: pts[0]! }];
    for (let i = 1; i < pts.length; i++) segs.push({ tip: "L", p: pts[i]! });
    if (tag === "polygon") segs.push({ tip: "Z" });
    return { tip: tag, segs };
  }
  if (tag === "line") {
    const g = (a: string) => parseFloat(el.getAttribute(a) ?? "0") || 0;
    return {
      tip: "line",
      segs: [
        { tip: "M", p: { x: g("x1"), y: g("y1") } },
        { tip: "L", p: { x: g("x2"), y: g("y2") } },
      ],
    };
  }
  return null;
}

/** Modeli, elemanın türüne göre native öznitelik(ler)e çevirir (path→d, poly→points…). */
function modelOznitelikleri(m: Model): Record<string, string> {
  if (m.tip === "path") return { d: yoluYaz(m.segs) };
  if (m.tip === "polyline" || m.tip === "polygon") {
    const pts = m.segs
      .map(anchorNoktasi)
      .filter((p): p is Nokta => p !== null)
      .map((p) => `${say(p.x)},${say(p.y)}`);
    return { points: pts.join(" ") };
  }
  const a = anchorNoktasi(m.segs[0]!) ?? { x: 0, y: 0 };
  const b = anchorNoktasi(m.segs[1]!) ?? { x: 0, y: 0 };
  return {
    x1: String(say(a.x)),
    y1: String(say(a.y)),
    x2: String(say(b.x)),
    y2: String(say(b.y)),
  };
}

// --- Bindirme (overlay) yönetimi ---

function katmaniKur(baglam: AracBaglami): void {
  const kap = baglam.aracKatmani();
  kat = document.createElementNS(SVG_NS, "svg");
  Object.assign(kat.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    overflow: "visible",
    pointerEvents: "none",
  });
  kap.appendChild(kat);
}

function cizgiEkle(a: Ref, b: Ref): void {
  if (!kat) return;
  const l = document.createElementNS(SVG_NS, "line");
  l.style.stroke = ACCENT;
  l.setAttribute("stroke-width", "1");
  l.style.opacity = "0.55";
  l.style.pointerEvents = "none";
  kat.appendChild(l);
  cizgiler.push({ a, b, el: l });
}

function tutamacEkle(ref: Ref): void {
  if (!kat) return;
  const c = document.createElementNS(SVG_NS, "circle");
  c.setAttribute("r", "4");
  c.setAttribute("fill", "#fff");
  c.style.stroke = ACCENT;
  c.setAttribute("stroke-width", "1.5");
  c.style.pointerEvents = "auto";
  c.style.cursor = "move";
  c.addEventListener("pointerdown", (o) => surukleBasla(ref, o));
  kat.appendChild(c);
  tutamaclar.push({ ref, el: c });
}

function anchorEkle(ref: Ref): void {
  if (!kat) return;
  const secili =
    seciliNokta != null &&
    seciliNokta.segIdx === ref.segIdx &&
    seciliNokta.alan === ref.alan;
  const r = document.createElementNS(SVG_NS, "rect");
  r.setAttribute("width", "8");
  r.setAttribute("height", "8");
  r.setAttribute("rx", "1.5");
  // Seçili çapa ters renkle (beyaz dolgu + vurgu çerçeve) belirgin gösterilir.
  if (secili) {
    r.style.fill = "#fff";
    r.style.stroke = ACCENT;
    r.setAttribute("stroke-width", "2");
  } else {
    r.style.fill = ACCENT;
    r.setAttribute("stroke", "#fff");
    r.setAttribute("stroke-width", "1.5");
  }
  r.style.pointerEvents = "auto";
  r.style.cursor = "move";
  r.addEventListener("pointerdown", (o) => surukleBasla(ref, o));
  kat.appendChild(r);
  anchorlar.push({ ref, el: r });
}

function imleriTemizle(): void {
  kat?.replaceChildren();
  anchorlar = [];
  tutamaclar = [];
  cizgiler = [];
}

/** Model yapısına göre tutamaç/çizgi/çapa şekillerini (yeniden) kurar. */
function imleriKur(): void {
  imleriTemizle();
  if (!model) return;
  const segs = model.segs;
  let curIdx = -1;
  let baslaIdx = -1;
  // 1) bağlayıcı çizgiler + tutamaçlar (çapaların altında).
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i]!;
    if (s.tip === "M") {
      curIdx = i;
      baslaIdx = i;
    } else if (s.tip === "L" || s.tip === "A") {
      curIdx = i;
    } else if (s.tip === "C") {
      cizgiEkle({ segIdx: curIdx, alan: "p" }, { segIdx: i, alan: "c1" });
      cizgiEkle({ segIdx: i, alan: "p" }, { segIdx: i, alan: "c2" });
      tutamacEkle({ segIdx: i, alan: "c1" });
      tutamacEkle({ segIdx: i, alan: "c2" });
      curIdx = i;
    } else if (s.tip === "Q") {
      cizgiEkle({ segIdx: curIdx, alan: "p" }, { segIdx: i, alan: "c" });
      cizgiEkle({ segIdx: i, alan: "p" }, { segIdx: i, alan: "c" });
      tutamacEkle({ segIdx: i, alan: "c" });
      curIdx = i;
    } else if (s.tip === "Z") {
      curIdx = baslaIdx;
    }
  }
  // 2) çapalar (üstte).
  for (let i = 0; i < segs.length; i++) {
    if (segs[i]!.tip !== "Z") anchorEkle({ segIdx: i, alan: "p" });
  }
  yerlestir();
}

/** Tüm şekilleri güncel model + eleman CTM'sinden ekran konumuna yerleştirir. */
function yerlestir(): void {
  if (!kat || !model || !seciliDugum || !baglamRef) return;
  const el = baglamRef.eleman(seciliDugum.kimlik);
  if (!(el instanceof SVGGraphicsElement)) return;
  const ctm = el.getScreenCTM();
  if (!ctm) return;
  const orijin = kat.getBoundingClientRect();
  const yerel = (p: Nokta): Nokta => {
    const sp = new DOMPoint(p.x, p.y).matrixTransform(ctm);
    return { x: sp.x - orijin.left, y: sp.y - orijin.top };
  };
  for (const c of cizgiler) {
    const a = noktaAl(model.segs, c.a);
    const b = noktaAl(model.segs, c.b);
    if (!a || !b) continue;
    const la = yerel(a);
    const lb = yerel(b);
    c.el.setAttribute("x1", String(la.x));
    c.el.setAttribute("y1", String(la.y));
    c.el.setAttribute("x2", String(lb.x));
    c.el.setAttribute("y2", String(lb.y));
  }
  for (const h of tutamaclar) {
    const p = noktaAl(model.segs, h.ref);
    if (!p) continue;
    const lp = yerel(p);
    h.el.setAttribute("cx", String(lp.x));
    h.el.setAttribute("cy", String(lp.y));
  }
  for (const a of anchorlar) {
    const p = noktaAl(model.segs, a.ref);
    if (!p) continue;
    const lp = yerel(p);
    a.el.setAttribute("x", String(lp.x - 4));
    a.el.setAttribute("y", String(lp.y - 4));
  }
}

// --- Sürükleme (canlı önizleme; bırakınca tek Command) ---

/**
 * Çevir modu önizlemesi: orijinal şekli (line/poly) GİZLER ve aynı ebeveynde,
 * aynı sunum stilinde geçici bir `path` koyar (kavis canlı görünsün). Orijinal
 * gizli kalır ama DOM'da → CTM geçerli → çapa/tutamaçlar yerinde durur.
 */
function cevirOnizlemeKur(el: SVGGraphicsElement): SVGPathElement | null {
  const ebeveyn = el.parentNode;
  if (!ebeveyn) return null;
  const p = document.createElementNS(SVG_NS, "path") as SVGPathElement;
  for (const a of Array.from(el.attributes)) {
    if (
      a.name === "data-kimlik" ||
      a.name === "points" ||
      a.name === "d" ||
      a.name === "x1" ||
      a.name === "y1" ||
      a.name === "x2" ||
      a.name === "y2"
    )
      continue;
    p.setAttribute(a.name, a.value); // fill/stroke/transform/class… kopyala
  }
  ebeveyn.insertBefore(p, el.nextSibling);
  el.style.visibility = "hidden";
  return p;
}

function surukleBasla(ref: Ref, olay: PointerEvent): void {
  if (!model) return;
  olay.preventDefault();
  olay.stopPropagation();
  const kavisIstek = (olay.ctrlKey || olay.metaKey) && ref.alan === "p";
  surukle = {
    ref,
    basSegs: klon(model.segs),
    basEkran: { x: olay.clientX, y: olay.clientY },
    egri: kavisIstek && model.tip === "path",
    // NON-path düzenlenebilir (line/polyline/polygon) → path'e çevirip kavisle.
    cevir: kavisIstek && model.tip !== "path",
    onizlemeEl: null,
    tasindi: false,
  };
  window.addEventListener("pointermove", surukleHareket);
  window.addEventListener("pointerup", surukleBirak);
}

function surukleHareket(olay: PointerEvent): void {
  if (!surukle || !model || !seciliDugum || !baglamRef) return;
  const el = baglamRef.eleman(seciliDugum.kimlik);
  if (!(el instanceof SVGGraphicsElement)) return;
  const ctm = el.getScreenCTM();
  if (!ctm) return;
  const ekrDx = olay.clientX - surukle.basEkran.x;
  const ekrDy = olay.clientY - surukle.basEkran.y;
  if (Math.hypot(ekrDx, ekrDy) > 3) surukle.tasindi = true;
  // Çevir modu: eşik aşılana dek hiçbir şey yapma (erken çevirme/titreme olmasın).
  if (surukle.cevir && !surukle.tasindi) return;
  const du = ekranDeltaKullanici(ctm, ekrDx, ekrDy);
  const segs = klon(surukle.basSegs);
  if (surukle.egri || surukle.cevir) egriUygula(segs, surukle.ref, du);
  else uygulaDelta(segs, surukle.ref, du.x, du.y);
  model.segs = segs;
  if (surukle.cevir) {
    // Orijinali gizle; kavisi geçici path önizlemesinde göster (segs zaten path).
    if (!surukle.onizlemeEl) surukle.onizlemeEl = cevirOnizlemeKur(el);
    surukle.onizlemeEl?.setAttribute("d", yoluYaz(segs));
    imleriKur();
  } else {
    for (const [ad, deger] of Object.entries(modelOznitelikleri(model)))
      el.setAttribute(ad, deger);
    // Eğri modu L→C çevirip yeni kollar ekleyebilir → şekilleri yeniden kur.
    if (surukle.egri) imleriKur();
    else yerlestir();
  }
}

function surukleBirak(): void {
  window.removeEventListener("pointermove", surukleHareket);
  window.removeEventListener("pointerup", surukleBirak);
  const s = surukle;
  surukle = null;
  if (!s || !model || !seciliDugum || !baglamRef) return;
  // Çevir önizlemesini temizle (varsa) → orijinali geri göster.
  if (s.onizlemeEl) {
    s.onizlemeEl.remove();
    const el0 = baglamRef.eleman(seciliDugum.kimlik);
    if (el0 instanceof SVGElement) el0.style.visibility = "";
  }
  // Çapayla her etkileşim (tık/taşıma/eğri) o düğümü seçili (vurgulu) tutar.
  if (s.ref.alan === "p") seciliNokta = s.ref;
  // Hareketsiz tık → yalnız seçim vurgusu, commit etme.
  if (!s.tasindi) {
    imleriKur();
    return;
  }
  const belge = baglamRef.depo.belge;
  if (belge) {
    if (s.cevir) {
      // line/polyline/polygon → tek Command'da path'e çevir + kavisli d yaz.
      baglamRef.gecmis.calistir(
        new SekliPathaCevirKomutu(belge, seciliDugum, yoluYaz(model.segs)),
      );
    } else {
      const oz = modelOznitelikleri(model);
      const komutlar = Object.entries(oz).map(
        ([ad, deger]) =>
          new OznitelikDegistirKomutu(belge, seciliDugum!, ad, deger),
      );
      baglamRef.gecmis.calistir(new BilesikKomut("düğüm düzenle", komutlar));
    }
  }
  yenidenKur(); // commit sonrası kanonik durumdan yeniden kur
}

/** Seçili (tek, kilitsiz, düzenlenebilir) elemandan modeli ve şekilleri kurar. */
function yenidenKur(): void {
  if (!baglamRef || !kat) return;
  if (surukle) return; // sürükleme sırasında dış değişiklikten yeniden kurma
  const sec = baglamRef.secim;
  const tek = sec.secililer.length === 1 ? sec.secili : null;
  const oncekiDugum = seciliDugum;
  seciliDugum =
    tek && !tek.kilitli && DUZENLENEBILIR.has(tek.etiket) ? tek : null;
  // Farklı nesneye geçildiyse düğüm vurgusu artık geçersiz → sıfırla.
  if (seciliDugum !== oncekiDugum) seciliNokta = null;
  if (!seciliDugum) {
    model = null;
    imleriTemizle();
    return;
  }
  const el = baglamRef.eleman(seciliDugum.kimlik);
  model = el ? modelKur(el) : null;
  if (!model) {
    imleriTemizle();
    return;
  }
  imleriKur();
}

/**
 * Düğüm aracı (§9.2, §11.6 1. dalga) — seçili path/polyline/polygon/line'ın çapa
 * noktalarını ve (path'te) Bézier kontrol tutamaçlarını sürükleyerek düzenler.
 * Düzenlemede path mutlak-normalize edilir; her sürükleme **tek Command** (İlke 2).
 * Çapayı taşımak bitişik tutamaçları da taşır; tutamaç tek başına eğriyi büker.
 */
const dugumAraci: Arac = {
  id: "dugum",
  etiketAnahtari: "arac.dugum",
  imlec: "crosshair",
  sira: 1,
  tutamacGizle: true,
  ikon: svg`<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.2">
    <path d="M2 12 C 5 4, 11 4, 14 12" />
    <rect x="0.8" y="10.8" width="2.6" height="2.6" fill="currentColor" stroke="none" />
    <rect x="12.6" y="10.8" width="2.6" height="2.6" fill="currentColor" stroke="none" />
    <circle cx="8" cy="5.4" r="1.4" fill="currentColor" stroke="none" />
  </svg>`,

  etkinlesti(baglam) {
    baglamRef = baglam;
    katmaniKur(baglam);
    secimCoz = baglam.secim.dinle(() => yenidenKur());
    depoCoz = baglam.depo.dinle(() => yenidenKur()); // commit/undo/redo/yeni dosya
    yenidenKur();
  },

  konumla(baglam) {
    baglamRef = baglam;
    if (model) yerlestir();
  },

  bas(olay, baglam) {
    // Press anındaki şekli HEMEN seç (Seç aracı gibi güvenilir seçim/geçiş) —
    // böylece yeni nesneye geçmek için Seç aracına dönmek gerekmez. Çapa/tutamaç
    // basışı kendi pointerdown'ında (surukleBasla) işlenir; bu yola gelmez.
    basHedef = baglam.isabet(olay);
    if (basHedef && !baglam.secim.icindeMi(basHedef)) baglam.secim.sec(basHedef);
  },

  tikla(_olay, baglam) {
    // Boşluğa tıklama (press de boşta) → seçimi bırak. Nesneye tıklama bas()'ta
    // zaten seçildi → release'te yeniden isabet ETME (tutamaçların üstüne düşüp
    // seçimi silebilir; Seç aracındaki aynı tuzak).
    if (!basHedef) baglam.secim.temizle();
    basHedef = null;
  },

  // Ctrl basılıyken kavis verilemeyen nesnede "yasak" (stop) imleci (kullanıcı isteği).
  imlecIcin(olay, baglam) {
    if (!olay.ctrlKey && !olay.metaKey) return undefined; // normal: crosshair/move
    const sec = baglam.secim;
    const tek = sec.secililer.length === 1 ? sec.secili : null;
    // Bir nesne seçiliyse onun kavislenebilirliği belirler — imleç NEREDE olursa
    // olsun (kullanıcı: "imleç farklı bir yerde de olsa stop çıksın").
    if (tek) return kavisliMi(tek) ? undefined : "not-allowed";
    // Seçim yok/çoklu → imlecin altındaki nesneye bak (üzerine gelince stop).
    const hedef = baglam.isabet(olay);
    if (!hedef) return undefined; // boşluk → normal
    return kavisliMi(hedef) ? undefined : "not-allowed";
  },

  pasiflesti() {
    secimCoz?.();
    secimCoz = null;
    depoCoz?.();
    depoCoz = null;
    window.removeEventListener("pointermove", surukleHareket);
    window.removeEventListener("pointerup", surukleBirak);
    // Yarım kalan çevir-önizlemesini temizle (orijinali geri göster).
    if (surukle?.onizlemeEl) {
      surukle.onizlemeEl.remove();
      const el0 = seciliDugum && baglamRef?.eleman(seciliDugum.kimlik);
      if (el0 instanceof SVGElement) el0.style.visibility = "";
    }
    surukle = null;
    imleriTemizle();
    kat?.remove();
    kat = null;
    seciliDugum = null;
    seciliNokta = null;
    basHedef = null;
    model = null;
    baglamRef = null;
  },
};

aracKayitDefteri.kaydet(dugumAraci);
