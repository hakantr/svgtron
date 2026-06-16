import { svg } from "lit";
import { aracKayitDefteri, type Arac, type TuvalNoktasi } from "../arac";
import { dugumOlustur, benzersizId, type Dugum } from "../../../cekirdek/belge/model/dugum";
import {
  BilesikKomut,
  DugumEkleKomutu,
} from "../../../cekirdek/komutlar/dugum-komutlari";
import { secimKaydiBastir } from "../../../cekirdek/secim/secim-kayit-bastir";
import type { Komut } from "../../../cekirdek/komutlar/komut";
import { noktaBasitlestir } from "../../../cekirdek/belge/model/yol-duzenleme";
import { hareketYoluDugumu } from "../../ozellikler/animasyon/hareket-yolu";
import { dDizesi } from "../yol-dizesi";
import { t } from "../../diller/dil";

const SVG_NS = "http://www.w3.org/2000/svg";

/** Hareket yolu çizimi: ince kesik çizgi (yol bir kılavuzdur, dolgu yok). */
const YOL_STILI: Record<string, string> = {
  fill: "none",
  stroke: "#8a5cf6",
  "stroke-width": "1.5",
  "stroke-dasharray": "5 4",
  "stroke-linecap": "round",
};

let noktalar: TuvalNoktasi[] = [];
let onizleme: SVGPathElement | null = null;
let hedef: Dugum | null = null; // çizim başında seçili olan animasyon hedefi


function sifirla(): void {
  onizleme?.remove();
  onizleme = null;
  noktalar = [];
  hedef = null;
}

/**
 * Hareket Yolu aracı (§9.2, TK-37 #4) — Tuval'e bir yol ÇİZ; çizim başında seçili
 * olan nesne, o yol boyunca animateMotion ile oynar. Yol görünür (kesik) bir
 * `<path>` olarak eklenir; nesneye `animateMotion` + `mpath` iliştirilir — tek
 * BilesikKomut (İlke 2). SMIL → Zaman Çizelgesi (Playback) oynatır.
 *
 * Hedef yoksa (seçim yok) yalnız yol çizilir + bilgi verilir. [Oynatma görsel — §5.]
 */
const hareketYoluAraci: Arac = {
  id: "hareket-yolu",
  etiketAnahtari: "arac.hareketYolu",
  imlec: "crosshair",
  sira: 30,
  ikon: svg`<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M2 12 C 4 4, 12 12, 14 4" stroke-dasharray="3 2"/><circle cx="2" cy="12" r="1.6" fill="currentColor" stroke="none"/></svg>`,

  bas(olay, baglam) {
    // Çizim başında seçili tek nesne = animasyon hedefi (yola bağlanacak).
    hedef =
      baglam.secim.secililer.length === 1 ? baglam.secim.secili : null;
    noktalar = [baglam.svgKonum(olay)];
    if (baglam.kok) {
      onizleme = document.createElementNS(SVG_NS, "path") as SVGPathElement;
      for (const [k, v] of Object.entries(YOL_STILI))
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
      const pid = benzersizId(belge.kok, "hyol");
      const yol = dugumOlustur("path", {
        ...YOL_STILI,
        id: pid,
        d: dDizesi(sade),
      });
      const komutlar: Komut[] = [
        new DugumEkleKomutu(belge, belge.kok, yol),
      ];
      if (hedef) {
        komutlar.push(new DugumEkleKomutu(belge, hedef, hareketYoluDugumu(pid)));
        baglam.bildir(t("animasyon.hareketYoluKuruldu"), "bilgi");
      } else {
        baglam.bildir(t("animasyon.hareketYoluHedefYok"), "uyari");
      }
      secimKaydiBastir(() => {
        baglam.gecmis.calistir(new BilesikKomut("hareket yolu çiz", komutlar));
        baglam.secim.sec(yol);
      });
    }
    sifirla();
  },

  pasiflesti() {
    sifirla();
  },
};

aracKayitDefteri.kaydet(hareketYoluAraci);
