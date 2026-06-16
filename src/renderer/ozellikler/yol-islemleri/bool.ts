import polygonClipping from "polygon-clipping";
import type { Belge } from "../../../cekirdek/belge/belge";
import type { Dugum } from "../../../cekirdek/belge/model/dugum";
import { dugumOlustur } from "../../../cekirdek/belge/model/dugum";
import type { Komut } from "../../../cekirdek/komutlar/komut";
import type { SecimDeposu } from "../../../cekirdek/secim/secim-deposu";
import { secimKaydiBastir } from "../../../cekirdek/secim/secim-kayit-bastir";
import type { KomutGecmisi } from "../../../cekirdek/komutlar/komut-gecmisi";
import {
  DugumCikarKomutu,
  DugumEkleKomutu,
  BilesikKomut,
} from "../../../cekirdek/komutlar/dugum-komutlari";
import {
  yoluAyristir,
  yoluYaz,
  type Segment,
} from "../../../cekirdek/belge/model/yol";
import { cizimErisimi } from "../../tuval/cizim-erisimi";
import {
  nesle,
  cokPoligonuD,
  type Cift,
  type CokPoligon,
} from "./bool-geometri";

/**
 * Boole (yol) işlemleri (AGENTS.md §11.2) — seçili kapalı şekilleri birleştir /
 * çıkar / kesiştir / dışla. Şekiller kök kullanıcı uzayında poligona düzleştirilir
 * (eğriler örneklenir), polygon-clipping ile işlenir, sonuç tek bir `<path>` olur.
 * Operandlar silinip sonuç eklenir — tek BileşikKomut (İlke 2).
 *
 * Sınır: eğriler düzleştirilir (poligon yaklaşımı) — lightweight, motorda doğru
 * render olan sağlam sonuç için bilinçli ödün (eğri-koruyan boole büyük bir
 * bağımlılık gerektirirdi). Operandın `transform`'u koordinatlara pişirilir;
 * `stroke-width` yerel ölçekte kopyalanır.
 */
export type BoolIslem = "birlesim" | "fark" | "kesisim" | "disla";
export type BoolSonuc = "tamam" | "yetersiz" | "bos";

const SVG_NS = "http://www.w3.org/2000/svg";
const GEOMETRI = new Set([
  "d",
  "points",
  "x",
  "y",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "width",
  "height",
  "x1",
  "y1",
  "x2",
  "y2",
  "transform",
  "id",
]);
const ETIKET: Record<BoolIslem, string> = {
  birlesim: "birleştir",
  fark: "çıkar",
  kesisim: "kesiştir",
  disla: "dışla",
};

let orneklemeSvg: SVGSVGElement | null = null;
function orneklemeYuzeyi(): SVGSVGElement {
  if (!orneklemeSvg) {
    orneklemeSvg = document.createElementNS(SVG_NS, "svg");
    orneklemeSvg.setAttribute("width", "0");
    orneklemeSvg.setAttribute("height", "0");
    Object.assign(orneklemeSvg.style, {
      position: "absolute",
      left: "-99999px",
      top: "0",
      visibility: "hidden",
    });
    document.body.appendChild(orneklemeSvg);
  }
  return orneklemeSvg;
}

const oz = (d: Dugum, ad: string): number =>
  parseFloat(d.oznitelikler.get(ad) ?? "") || 0;

/** Bir düğümü (türüne göre) yerel-koordinatlı bir `path` `d` dizesine çevirir (kapalı değilse null). */
function elemandanD(d: Dugum): string | null {
  switch (d.etiket) {
    case "path":
      return d.oznitelikler.get("d") ?? null;
    case "rect": {
      const x = oz(d, "x");
      const y = oz(d, "y");
      const w = oz(d, "width");
      const h = oz(d, "height");
      if (w <= 0 || h <= 0) return null;
      return `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
    }
    case "circle": {
      const cx = oz(d, "cx");
      const cy = oz(d, "cy");
      const r = oz(d, "r");
      if (r <= 0) return null;
      return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
    }
    case "ellipse": {
      const cx = oz(d, "cx");
      const cy = oz(d, "cy");
      const rx = oz(d, "rx");
      const ry = oz(d, "ry");
      if (rx <= 0 || ry <= 0) return null;
      return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
    }
    case "polygon": {
      const n =
        (d.oznitelikler.get("points") ?? "").match(
          /-?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/g,
        ) ?? [];
      if (n.length < 6) return null;
      const p = n.map(Number);
      let s = `M ${p[0]} ${p[1]}`;
      for (let i = 2; i + 1 < p.length; i += 2) s += ` L ${p[i]} ${p[i + 1]}`;
      return s + " Z";
    }
    default:
      return null; // polyline/line/g/text… kapalı alan değil
  }
}

/** `d`'yi alt-yollara (her M bir alt-yol) böler. */
function altYollar(d: string): string[] {
  let segs: Segment[];
  try {
    segs = yoluAyristir(d);
  } catch {
    return [];
  }
  const gruplar: Segment[][] = [];
  for (const s of segs) {
    if (s.tip === "M" || gruplar.length === 0) gruplar.push([s]);
    else gruplar[gruplar.length - 1]!.push(s);
  }
  return gruplar.map((g) => yoluYaz(g));
}

/** Bir alt-yolu tarayıcının yol ölçümüyle nokta dizisine örnekler (yerel koord.). */
function ornekleYol(altYolD: string): Cift[] {
  const yol = document.createElementNS(SVG_NS, "path") as SVGPathElement;
  yol.setAttribute("d", altYolD);
  orneklemeYuzeyi().appendChild(yol);
  const pts: Cift[] = [];
  try {
    const uzunluk = yol.getTotalLength();
    if (uzunluk > 0) {
      const n = Math.max(12, Math.min(720, Math.ceil(uzunluk / 2)));
      for (let i = 0; i < n; i++) {
        const p = yol.getPointAtLength((i / n) * uzunluk);
        pts.push([p.x, p.y]);
      }
    }
  } catch {
    /* geçersiz yol → boş */
  }
  yol.remove();
  return pts;
}

/**
 * Bir düğümü **kök kullanıcı uzayında** CokPoligon'a düzleştirir (yoksa null).
 *
 * Koordinat eşlemesi `kokInv ∘ el.getScreenCTM()` ile yapılır: bu, ekran/viewBox/
 * zoom faktörlerini sadeleştirip elemanın yerel noktalarını, kök `<svg>` çocuk-
 * larının yorumlandığı uzaya tam olarak taşır. (`getCTM()` Chrome'da viewBox
 * dönüşümünü içerdiğinden doğrudan kullanılırsa sonuç kayar/ölçeklenir.)
 */
export function dugumCokPoligonu(
  d: Dugum,
  el: Element,
  kokInv: DOMMatrix | null,
): CokPoligon | null {
  const yerelD = elemandanD(d);
  if (!yerelD) return null;
  let ctm: DOMMatrix | null = null;
  if (el instanceof SVGGraphicsElement) {
    const ekran = el.getScreenCTM();
    if (ekran) ctm = kokInv ? kokInv.multiply(ekran) : ekran;
  }
  const halkalar = altYollar(yerelD)
    .map(ornekleYol)
    .filter((pts) => pts.length >= 3)
    .map((pts) =>
      ctm
        ? pts.map(([x, y]): Cift => {
            const sp = new DOMPoint(x, y).matrixTransform(ctm);
            return [sp.x, sp.y];
          })
        : pts,
    );
  return halkalar.length ? nesle(halkalar) : null;
}

function islemiCalistir(islem: BoolIslem, geoms: CokPoligon[]): CokPoligon {
  const [ilk, ...kalan] = geoms as [CokPoligon, ...CokPoligon[]];
  switch (islem) {
    case "birlesim":
      return polygonClipping.union(ilk, ...kalan) as CokPoligon;
    case "fark":
      return polygonClipping.difference(ilk, ...kalan) as CokPoligon;
    case "kesisim":
      return polygonClipping.intersection(ilk, ...kalan) as CokPoligon;
    case "disla":
      return polygonClipping.xor(ilk, ...kalan) as CokPoligon;
  }
}

/** Belge sırası (DFS = boyama sırası) — operandları alttan üste sıralamak için. */
export function belgeSirasi(kok: Dugum): Map<string, number> {
  const sira = new Map<string, number>();
  let i = 0;
  const yiz = (d: Dugum): void => {
    sira.set(d.kimlik, i++);
    for (const c of d.cocuklar) yiz(c);
  };
  yiz(kok);
  return sira;
}

/**
 * Seçili şekillere boole işlemini uygular. Operandları alttan üste sıralar
 * (fark = en alttaki eksi diğerleri; stil en alttakinden alınır), sonucu tek bir
 * `<path>` yapar ve tek BileşikKomut ile commit eder.
 */
export function booleUygula(
  belge: Belge,
  secim: SecimDeposu,
  gecmis: KomutGecmisi,
  islem: BoolIslem,
): BoolSonuc {
  const sira = belgeSirasi(belge.kok);
  const aday = [...secim.secililer].sort(
    (a, b) => (sira.get(a.kimlik) ?? 0) - (sira.get(b.kimlik) ?? 0),
  );
  // Grup operand kabul edilmez (boole yol geometrisi üzerinde çalışır) — grup
  // seçiliyken işlem yapılmaz; menü/palet de bu yolla pasifleşir (kullanıcı isteği).
  if (aday.some((d) => d.etiket === "g")) return "yetersiz";

  const operandlar: Dugum[] = [];
  const geoms: CokPoligon[] = [];
  let kokInv: DOMMatrix | null = null;
  for (const d of aday) {
    const el = cizimErisimi.eleman(d.kimlik);
    if (!kokInv && el instanceof SVGGraphicsElement) {
      kokInv = el.ownerSVGElement?.getScreenCTM()?.inverse() ?? null;
    }
    const cp = el ? dugumCokPoligonu(d, el, kokInv) : null;
    if (cp && cp.length) {
      operandlar.push(d);
      geoms.push(cp);
    }
  }
  if (operandlar.length < 2) return "yetersiz";

  const sonuc = islemiCalistir(islem, geoms);
  if (!sonuc.length) return "bos";
  const d = cokPoligonuD(sonuc);
  if (!d) return "bos";

  sonucuYaz(belge, secim, gecmis, operandlar, d, ETIKET[islem]);
  return "tamam";
}

/**
 * Operandları tek bir `<path>` ile değiştirir (stil en alttaki operanddan;
 * geometri/transform/id hariç). Operandları sil + sonucu ekle = tek BileşikKomut.
 * Boole ve Şekil Oluşturucu ortak kullanır.
 */
export function sonucuYaz(
  belge: Belge,
  secim: SecimDeposu,
  gecmis: KomutGecmisi,
  operandlar: Dugum[],
  d: string,
  etiket: string,
): void {
  const attrs: Record<string, string> = {};
  for (const [k, v] of operandlar[0]!.oznitelikler)
    if (!GEOMETRI.has(k)) attrs[k] = v;
  attrs.d = d;
  const yeni = dugumOlustur("path", attrs);
  const komutlar: Komut[] = operandlar.map(
    (op) => new DugumCikarKomutu(belge, belge.ebeveyn(op) ?? belge.kok, op),
  );
  komutlar.push(new DugumEkleKomutu(belge, belge.kok, yeni));
  secimKaydiBastir(() => {
    gecmis.calistir(new BilesikKomut(etiket, komutlar));
    secim.sec(yeni);
  });
}

/** Atomik yüz hesabında işlenebilecek en fazla operand (2^N patlamasını önler). */
export const MAKS_ATOMIK_OPERAND = 8;

/**
 * Atomik yüzler (Şekil Oluşturucu, §11.2): N şeklin örtüşmesinin oluşturduğu en
 * küçük bölgeler. Her boş-olmayan alt küme T için: (∩ T) − (∪ T-dışı). 2^N alt
 * küme — N en çok {@link MAKS_ATOMIK_OPERAND}'la sınırlıdır.
 */
export function atomikYuzler(geoms: CokPoligon[]): CokPoligon[] {
  const N = Math.min(geoms.length, MAKS_ATOMIK_OPERAND);
  const yuzler: CokPoligon[] = [];
  for (let mask = 1; mask < 1 << N; mask++) {
    let bolge: CokPoligon | null = null;
    let bos = false;
    for (let i = 0; i < N; i++) {
      if (mask & (1 << i)) {
        bolge =
          bolge === null
            ? geoms[i]!
            : (polygonClipping.intersection(bolge, geoms[i]!) as CokPoligon);
        if (!bolge.length) {
          bos = true;
          break;
        }
      }
    }
    if (bos || !bolge || !bolge.length) continue;
    for (let i = 0; i < N && bolge.length; i++) {
      if (!(mask & (1 << i)))
        bolge = polygonClipping.difference(bolge, geoms[i]!) as CokPoligon;
    }
    if (bolge.length) yuzler.push(bolge);
  }
  return yuzler;
}

/** Verilen yüzleri (CokPoligon) tek bir CokPoligon'da birleştirir (union). */
export function yuzleriBirlestir(yuzler: CokPoligon[]): CokPoligon {
  if (yuzler.length === 0) return [];
  const [ilk, ...kalan] = yuzler as [CokPoligon, ...CokPoligon[]];
  return kalan.length
    ? (polygonClipping.union(ilk, ...kalan) as CokPoligon)
    : ilk;
}
