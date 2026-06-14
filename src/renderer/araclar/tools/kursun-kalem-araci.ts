import { svg } from "lit";
import { aracKayitDefteri, type Arac, type TuvalNoktasi } from "../arac";
import { dugumOlustur } from "../../../cekirdek/belge/model/dugum";
import { DugumEkleKomutu } from "../../../cekirdek/komutlar/dugum-komutlari";
import { noktaBasitlestir } from "../../../cekirdek/belge/model/yol-duzenleme";
import { dDizesi } from "../yol-dizesi";

const SVG_NS = "http://www.w3.org/2000/svg";

const VARSAYILAN: Record<string, string> = {
  fill: "none",
  stroke: "#1f2937",
  "stroke-width": "2",
  "stroke-linejoin": "round",
  "stroke-linecap": "round",
};

let noktalar: TuvalNoktasi[] = [];
let onizleme: SVGPathElement | null = null;


function sifirla(): void {
  onizleme?.remove();
  onizleme = null;
  noktalar = [];
}

/**
 * Kurşun Kalem (§9.2) — serbest çizim. Sürükleme boyunca noktalar toplanır;
 * bırakınca RDP ile basitleştirilip tek `<path>` olur (tek Command, İlke 2).
 */
const kursunKalem: Arac = {
  id: "kursun-kalem",
  etiketAnahtari: "arac.kursunKalem",
  imlec: "crosshair",
  sira: 6,
  ikon: svg`<svg viewBox="0 0 16 16" width="16" height="16"><path d="M10.5 2.2 L13.8 5.5 L6 13.3 L2.5 14 L3.2 10.5 Z" fill="currentColor" stroke="none"/><path d="M9.3 3.4 L12.6 6.7" stroke="var(--yuzey, #fff)" stroke-width="1.1"/></svg>`,

  bas(olay, baglam) {
    noktalar = [baglam.svgKonum(olay)];
    if (baglam.kok) {
      onizleme = document.createElementNS(SVG_NS, "path") as SVGPathElement;
      for (const [k, v] of Object.entries(VARSAYILAN))
        onizleme.setAttribute(k, v);
      baglam.kok.appendChild(onizleme);
    }
  },

  surukle(olay, baglam) {
    if (!onizleme) return;
    noktalar.push(baglam.svgKonum(olay));
    onizleme.setAttribute("d", dDizesi(noktalar));
  },

  birak(_olay, baglam) {
    const belge = baglam.depo.belge;
    if (belge && noktalar.length >= 2) {
      const sade = noktaBasitlestir(noktalar, 1.5);
      const dugum = dugumOlustur("path", { ...VARSAYILAN, d: dDizesi(sade) });
      baglam.gecmis.calistir(new DugumEkleKomutu(belge, belge.kok, dugum));
      baglam.secim.sec(dugum);
    }
    sifirla();
  },

  pasiflesti() {
    sifirla();
  },
};

aracKayitDefteri.kaydet(kursunKalem);
