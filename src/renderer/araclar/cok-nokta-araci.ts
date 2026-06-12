import type { TemplateResult } from "lit";
import type { Arac, AracBaglami, TuvalNoktasi } from "./arac";
import { dugumOlustur } from "../../cekirdek/belge/model/dugum";
import { DugumEkleKomutu } from "../../cekirdek/komutlar/dugum-komutlari";
import { say } from "../tuval/donusum";

const SVG_NS = "http://www.w3.org/2000/svg";
const KAPAT_ESIGI = 10; // px (başlangıca yakınlık → bitir)

/** Çok-tıklamalı nokta dizisi aracı tanımı (polyline/polygon). */
export interface CokNoktaTanimi {
  readonly id: string;
  readonly etiketAnahtari: string;
  readonly ikon: TemplateResult;
  readonly sira?: number;
  readonly svgEtiket: "polyline" | "polygon";
  readonly varsayilan: Record<string, string>;
}

/**
 * Çok-tıklamalı nokta dizisi aracı fabrikası (§9.2) — Çoklu Çizgi / Çokgen.
 * Kalem gibi: tıkla=nokta ekle, hover=ipucu, başlangıca tıkla/Enter=bitir,
 * Esc=iptal. Bitince tek Command (İlke 2); polygon kendiliğinden kapanır.
 */
export function cokNoktaAraci(tanim: CokNoktaTanimi): Arac {
  let noktalar: TuvalNoktasi[] = [];
  let ilkEkran: { x: number; y: number } | null = null;
  let onizleme: SVGElement | null = null;

  const dizge = (ipucu?: TuvalNoktasi): string =>
    (ipucu ? [...noktalar, ipucu] : noktalar)
      .map((p) => `${say(p.x)},${say(p.y)}`)
      .join(" ");

  const onizlemeKur = (baglam: AracBaglami): void => {
    if (!baglam.kok || onizleme) return;
    onizleme = document.createElementNS(SVG_NS, tanim.svgEtiket);
    onizleme.setAttribute("fill", "none");
    onizleme.setAttribute("stroke", "#4a90e2");
    onizleme.setAttribute("stroke-width", "1.5");
    onizleme.setAttribute("stroke-dasharray", "4 3");
    baglam.kok.appendChild(onizleme);
  };
  const onizlemeYenile = (ipucu?: TuvalNoktasi): void =>
    onizleme?.setAttribute("points", dizge(ipucu));
  const sifirla = (): void => {
    onizleme?.remove();
    onizleme = null;
    noktalar = [];
    ilkEkran = null;
  };
  const bitir = (baglam: AracBaglami): void => {
    const belge = baglam.depo.belge;
    if (belge && noktalar.length >= 2) {
      const dugum = dugumOlustur(tanim.svgEtiket, {
        ...tanim.varsayilan,
        points: dizge(),
      });
      baglam.gecmis.calistir(new DugumEkleKomutu(belge, belge.kok, dugum));
      baglam.secim.sec(dugum);
    }
    sifirla();
  };

  return {
    id: tanim.id,
    etiketAnahtari: tanim.etiketAnahtari,
    ikon: tanim.ikon,
    imlec: "crosshair",
    sira: tanim.sira,

    bas(olay, baglam) {
      const nokta = baglam.svgKonum(olay);
      if (
        noktalar.length >= 2 &&
        ilkEkran &&
        Math.hypot(olay.clientX - ilkEkran.x, olay.clientY - ilkEkran.y) <=
          KAPAT_ESIGI
      ) {
        bitir(baglam);
        return;
      }
      if (noktalar.length === 0)
        ilkEkran = { x: olay.clientX, y: olay.clientY };
      noktalar.push(nokta);
      onizlemeKur(baglam);
      onizlemeYenile(nokta);
    },

    hareket(olay, baglam) {
      if (noktalar.length > 0 && onizleme)
        onizlemeYenile(baglam.svgKonum(olay));
    },

    tus(olay, baglam) {
      if (olay.key === "Enter") {
        olay.preventDefault();
        bitir(baglam);
      } else if (olay.key === "Escape") {
        olay.preventDefault();
        sifirla();
      }
    },

    pasiflesti() {
      sifirla();
    },
  };
}
