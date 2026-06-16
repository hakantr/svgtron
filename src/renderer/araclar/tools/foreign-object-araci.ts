import { svg } from "lit";
import { aracKayitDefteri, type Arac } from "../arac";
import { dugumOlustur } from "../../../cekirdek/belge/model/dugum";
import { DugumEkleKomutu } from "../../../cekirdek/komutlar/dugum-komutlari";
import { secimKaydiBastir } from "../../../cekirdek/secim/secim-kayit-bastir";
import { say } from "../../tuval/donusum";
import { t } from "../../diller/dil";

const XHTML_NS = "http://www.w3.org/1999/xhtml";

/**
 * Gömülü HTML (`<foreignObject>`, §9.2, §10.3, TK-37 #7) — tıklanan yere içinde
 * düzenlenebilir bir XHTML `<div>` olan bir foreignObject koyar.
 *
 * Güvenlik/uyum sınırları (TK-37 #7): içe aktarımda `script`, `on…` olay öznitelikleri
 * ve `javascript:` href'leri ayıklanır (TK-13) → editör aktif betik çalıştırmaz; çıktıda
 * `foreignObject` GENİŞ UYUMLULUK
 * profilinde her motorda aynı render olmayabilir → yerleştirmede kullanıcı uyarılır.
 * Tek Command (İlke 2). XHTML içeriği Yansıtıcı tarafından doğru ad uzayında render
 * edilir; `xmlns` modelde tutulur ki dışa aktarım geçerli/taşınabilir kalsın.
 */
const foreignObjectAraci: Arac = {
  id: "foreignObject",
  etiketAnahtari: "arac.foreignObject",
  imlec: "crosshair",
  sira: 19,
  ikon: svg`<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="2" y="2.5" width="12" height="11" rx="1.2" stroke-dasharray="2 1.4"/><path d="M5 6 H11 M5 8.5 H11 M5 11 H9"/></svg>`,

  tikla(olay, baglam) {
    const nokta = baglam.svgKonum(olay);
    const belge = baglam.depo.belge;
    if (!belge) return;
    const div = dugumOlustur(
      "div",
      {
        xmlns: XHTML_NS,
        style: "font: 14px sans-serif; color: #111; width: 100%; height: 100%;",
      },
      [],
      t("foreignObject.ornek"),
    );
    const fo = dugumOlustur(
      "foreignObject",
      {
        x: String(say(nokta.x)),
        y: String(say(nokta.y)),
        width: "180",
        height: "60",
      },
      [div],
    );
    secimKaydiBastir(() => {
      baglam.gecmis.calistir(new DugumEkleKomutu(belge, belge.kok, fo));
      baglam.secim.sec(fo);
    });
    baglam.bildir(t("foreignObject.uyari"), "uyari");
  },
};

aracKayitDefteri.kaydet(foreignObjectAraci);
