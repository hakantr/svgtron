import type { TemplateResult } from "lit";
import type { Arac, AracBaglami, TuvalNoktasi } from "./arac";
import { dugumOlustur } from "../../cekirdek/belge/model/dugum";
import { DugumEkleKomutu } from "../../cekirdek/komutlar/dugum-komutlari";
import { secimKaydiBastir } from "../../cekirdek/secim/secim-kayit-bastir";
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
  let sonBaglam: AracBaglami | null = null;
  // "Bitirme adımı": çizim biter bitmez Ctrl+Z bunu geri alıp çizime döndürür.
  // Yeni etkileşim (yeni çizim / araç değişimi) olunca temizlenir → normal akış.
  let sonBitirme: {
    kimlik: string;
    noktalar: TuvalNoktasi[];
    ekran: { x: number; y: number } | null;
  } | null = null;

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
      secimKaydiBastir(() => {
        baglam.gecmis.calistir(new DugumEkleKomutu(belge, belge.kok, dugum));
        baglam.secim.sec(dugum);
      });
      // Bitirme adımını hatırla → Ctrl+Z çizime geri dönsün (kullanıcı isteği).
      sonBitirme = {
        kimlik: dugum.kimlik,
        noktalar: noktalar.slice(),
        ekran: ilkEkran,
      };
    }
    sifirla();
  };

  /** Ctrl+Z'yi "bitirme adımı"na özel yakala: şekli kaldır, çizime geri dön. */
  const geriAc = (): boolean => {
    if (!sonBitirme || !sonBaglam) return false;
    const { kimlik, noktalar: pts, ekran } = sonBitirme;
    sonBitirme = null;
    const belge = sonBaglam.depo.belge;
    // Şekli geri al. `secim.sec` araya bir "bırakma" seçim adımı yazmış olabilir
    // (çizimden önce çoklu seçim vardıysa) → şekil kalkana dek geri al (en çok
    // birkaç adım: edit + olası seçim adımı).
    let guvenlik = 4;
    while (
      belge?.dugumBul(kimlik) &&
      sonBaglam.gecmis.geriAlinabilir &&
      guvenlik-- > 0
    )
      sonBaglam.gecmis.geriAl();
    sonBaglam.secim.temizle();
    // Çizimi yeniden aç (kaldığı noktalarla).
    noktalar = pts.slice();
    ilkEkran = ekran;
    onizlemeKur(sonBaglam);
    onizlemeYenile();
    return true;
  };

  return {
    id: tanim.id,
    etiketAnahtari: tanim.etiketAnahtari,
    ikon: tanim.ikon,
    imlec: "crosshair",
    sira: tanim.sira,

    bas(olay, baglam) {
      sonBaglam = baglam;
      sonBitirme = null; // yeni etkileşim → eski bitirme normal geri-al akışına geçer
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
      sonBaglam = baglam;
      if (noktalar.length > 0 && onizleme)
        onizlemeYenile(baglam.svgKonum(olay));
    },

    tus(olay, baglam) {
      sonBaglam = baglam;
      if (olay.key === "Enter") {
        olay.preventDefault();
        bitir(baglam);
      } else if (olay.key === "Escape") {
        olay.preventDefault();
        sifirla();
      }
    },

    sagTik(baglam) {
      sonBaglam = baglam;
      if (noktalar.length === 0) return false;
      bitir(baglam); // sağ tık = Enter (çizimi bitir)
      return true;
    },

    geriAlYakala() {
      return geriAc();
    },

    pasiflesti() {
      sonBitirme = null;
      sifirla();
    },
  };
}
