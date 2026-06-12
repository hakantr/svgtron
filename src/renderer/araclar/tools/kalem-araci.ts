import { svg } from "lit";
import {
  aracKayitDefteri,
  type Arac,
  type AracBaglami,
  type TuvalNoktasi,
} from "../arac";
import { dugumOlustur } from "../../../cekirdek/belge/model/dugum";
import { DugumEkleKomutu } from "../../../cekirdek/komutlar/dugum-komutlari";
import { say } from "../../tuval/donusum";

const SVG_NS = "http://www.w3.org/2000/svg";
const KAPAT_ESIGI = 10; // px (başlangıç noktasına yakınlık)

const VARSAYILAN: Record<string, string> = {
  fill: "none",
  stroke: "#1f2937",
  "stroke-width": "2",
  "stroke-linejoin": "round",
  "stroke-linecap": "round",
};

// Çizim durumu (tekil araç).
let noktalar: TuvalNoktasi[] = [];
let ilkEkran: { x: number; y: number } | null = null;
let onizleme: SVGPathElement | null = null;

function dDizesi(
  nokta: readonly TuvalNoktasi[],
  ipucu?: TuvalNoktasi,
  kapali = false,
): string {
  if (nokta.length === 0) return "";
  const parcalar = [`M ${say(nokta[0]!.x)} ${say(nokta[0]!.y)}`];
  for (let i = 1; i < nokta.length; i++)
    parcalar.push(`L ${say(nokta[i]!.x)} ${say(nokta[i]!.y)}`);
  if (ipucu) parcalar.push(`L ${say(ipucu.x)} ${say(ipucu.y)}`);
  if (kapali) parcalar.push("Z");
  return parcalar.join(" ");
}

function onizlemeKur(baglam: AracBaglami): void {
  if (!baglam.kok || onizleme) return;
  onizleme = document.createElementNS(SVG_NS, "path") as SVGPathElement;
  onizleme.setAttribute("fill", "none");
  onizleme.setAttribute("stroke", "#4a90e2");
  onizleme.setAttribute("stroke-width", "1.5");
  onizleme.setAttribute("stroke-dasharray", "4 3");
  baglam.kok.appendChild(onizleme);
}

function onizlemeYenile(ipucu?: TuvalNoktasi, kapali = false): void {
  onizleme?.setAttribute("d", dDizesi(noktalar, ipucu, kapali));
}

function sifirla(): void {
  onizleme?.remove();
  onizleme = null;
  noktalar = [];
  ilkEkran = null;
}

function bitir(baglam: AracBaglami, kapali: boolean): void {
  const belge = baglam.depo.belge;
  if (belge && noktalar.length >= 2) {
    const dugum = dugumOlustur("path", {
      ...VARSAYILAN,
      d: dDizesi(noktalar, undefined, kapali),
    });
    baglam.gecmis.calistir(new DugumEkleKomutu(belge, belge.kok, dugum));
    baglam.secim.sec(dugum);
  }
  sifirla();
}

/**
 * Kalem aracı (§9.2, §11.6) — çok tıklamayla düz-kenarlı `path` çizer. Hover
 * ipucu çizgisi gösterir; başlangıç noktasına yakın tıklamak yolu KAPATIR, Enter
 * AÇIK bitirir, Esc iptal eder. Bitince tek Command (İlke 2). (Bézier eğri
 * tutamaçları sonraki adımda.)
 */
const kalemAraci: Arac = {
  id: "kalem",
  etiketAnahtari: "arac.kalem",
  imlec: "crosshair",
  sira: 5,
  ikon: svg`<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M11.5 1.8l2.7 2.7-7.1 7.1-3.4.7.7-3.4 7.1-7.1Z" stroke="currentColor" stroke-width="0.6" fill="none"/><path d="M11.5 1.8l2.7 2.7-1.3 1.3-2.7-2.7Z"/></svg>`,

  bas(olay, baglam) {
    const nokta = baglam.svgKonum(olay);
    if (
      noktalar.length >= 2 &&
      ilkEkran &&
      Math.hypot(olay.clientX - ilkEkran.x, olay.clientY - ilkEkran.y) <=
        KAPAT_ESIGI
    ) {
      bitir(baglam, true); // başlangıca tıklandı → kapat
      return;
    }
    if (noktalar.length === 0) ilkEkran = { x: olay.clientX, y: olay.clientY };
    noktalar.push(nokta);
    onizlemeKur(baglam);
    onizlemeYenile(nokta);
  },

  hareket(olay, baglam) {
    // Son noktadan imlece uzanan ipucu çizgisi (rubber-band).
    if (noktalar.length > 0 && onizleme) onizlemeYenile(baglam.svgKonum(olay));
  },

  tus(olay, baglam) {
    if (olay.key === "Enter") {
      olay.preventDefault();
      bitir(baglam, false);
    } else if (olay.key === "Escape") {
      olay.preventDefault();
      sifirla();
    }
  },

  pasiflesti() {
    sifirla();
  },
};

aracKayitDefteri.kaydet(kalemAraci);
