import type { TemplateResult } from "lit";
import type { Arac, TuvalNoktasi } from "./arac";
import { dugumOlustur } from "../../cekirdek/belge/model/dugum";
import { DugumEkleKomutu } from "../../cekirdek/komutlar/dugum-komutlari";

const SVG_NS = "http://www.w3.org/2000/svg";

/** Bir çizim aracı tanımı (şekil üretir). */
export interface CizimTanimi {
  readonly id: string;
  readonly etiketAnahtari: string;
  readonly ikon: TemplateResult;
  readonly sira?: number;
  /** Üretilecek SVG elemanı (rect/ellipse/line/text...). */
  readonly svgEtiket: string;
  /** Şeklin varsayılan görünüm öznitelikleri (fill/stroke...). */
  readonly varsayilan: Record<string, string>;
  /** Metin içeriği (text aracı için). */
  readonly metin?: string;
  /** Tek tıkla oluştur (sürükleme gerektirmez; örn. metin). */
  readonly tikKur?: boolean;
  /** Başlangıç ve güncel noktadan geometri özniteliklerini üretir. */
  geometri(
    bas: TuvalNoktasi,
    simdi: TuvalNoktasi,
    oranli: boolean,
  ): Record<string, string>;
}

/**
 * Çizim aracı fabrikası (§9.2, §11.6) — sürükleyerek (ya da tıklayarak) Tuval'e
 * yeni nesne üretir. Sürükleme sırasında geçici DOM önizlemesi (görünüm durumu);
 * bırakınca tek Command (İlke 2/§9.4). Üretilen şekil seçilir.
 */
export function cizimAraci(tanim: CizimTanimi): Arac {
  let bas: TuvalNoktasi | null = null;
  let onizleme: SVGElement | null = null;

  const oznitelikleriUygula = (
    el: SVGElement,
    ek: Record<string, string>,
  ): void => {
    for (const [k, v] of Object.entries({ ...tanim.varsayilan, ...ek }))
      el.setAttribute(k, v);
  };

  return {
    id: tanim.id,
    etiketAnahtari: tanim.etiketAnahtari,
    ikon: tanim.ikon,
    imlec: "crosshair",
    sira: tanim.sira,

    bas(olay, baglam) {
      bas = baglam.svgKonum(olay);
      if (baglam.kok) {
        onizleme = document.createElementNS(SVG_NS, tanim.svgEtiket);
        oznitelikleriUygula(onizleme, tanim.geometri(bas, bas, olay.shiftKey));
        if (tanim.metin) onizleme.textContent = tanim.metin;
        baglam.kok.appendChild(onizleme);
      }
    },

    surukle(olay, baglam) {
      if (!bas || !onizleme) return;
      oznitelikleriUygula(
        onizleme,
        tanim.geometri(bas, baglam.svgKonum(olay), olay.shiftKey),
      );
    },

    birak(olay, baglam) {
      onizleme?.remove();
      onizleme = null;
      const belge = baglam.depo.belge;
      const baslangic = bas;
      bas = null;
      if (!baslangic || !belge) return;

      const simdi = baglam.svgKonum(olay);
      const yeterli =
        tanim.tikKur ||
        Math.hypot(simdi.x - baslangic.x, simdi.y - baslangic.y) > 2;
      if (!yeterli) return;

      const geo = tanim.geometri(baslangic, simdi, olay.shiftKey);
      const dugum = dugumOlustur(
        tanim.svgEtiket,
        { ...tanim.varsayilan, ...geo },
        [],
        tanim.metin,
      );
      baglam.gecmis.calistir(new DugumEkleKomutu(belge, belge.kok, dugum));
      baglam.secim.sec(dugum);
    },
  };
}
