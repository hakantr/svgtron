import { menuKayitDefteri } from "../../../cekirdek/registry/menu-registry";
import {
  sembolYap,
  sembolGenislet,
  sembolDuzenle,
  sembolBitir,
} from "./semboller";
import { izolasyon } from "./izolasyon";
import { bildirimServisi } from "../../kabuk/bildirim-servisi";
import { t } from "../../diller/dil";

/**
 * Sembol eylemlerini menü registry'sine kaydeder (İlke 5) — "Düzen" grubunda;
 * menü çubuğu + Komut Paleti'nde otomatik belirir. Kabuk değişmez.
 */
menuKayitDefteri.kaydet({
  id: "duzen.sembolYap",
  grup: "duzen",
  etiketAnahtari: "menu.duzen.sembolYap",
  sira: 10,
  calistir: (b) => {
    if (b.depo.belge) sembolYap(b.depo.belge, b.secim, b.gecmis);
  },
});

menuKayitDefteri.kaydet({
  id: "duzen.sembolGenislet",
  grup: "duzen",
  etiketAnahtari: "menu.duzen.sembolGenislet",
  sira: 11,
  calistir: (b) => {
    if (b.depo.belge) sembolGenislet(b.depo.belge, b.secim, b.gecmis);
  },
});

/** Sembolü Düzenle (izolasyon başlat) — seçili <use>'tan (TK-37 #1). */
menuKayitDefteri.kaydet({
  id: "duzen.sembolDuzenle",
  grup: "duzen",
  etiketAnahtari: "menu.duzen.sembolDuzenle",
  sira: 12,
  calistir: (b) => {
    if (!b.depo.belge) return;
    if (sembolDuzenle(b.depo.belge, b.secim, b.gecmis))
      bildirimServisi.bildir(t("sembol.izolasyonBasladi"), "bilgi");
    else b.hataBildir(t("sembol.izolasyonGecersiz"));
  },
});

/** Sembolü Bitir (izolasyondan çık, ana sembole geri yaz) — TK-37 #1. */
menuKayitDefteri.kaydet({
  id: "duzen.sembolBitir",
  grup: "duzen",
  etiketAnahtari: "menu.duzen.sembolBitir",
  sira: 13,
  calistir: (b) => {
    if (!b.depo.belge) return;
    if (!izolasyon.aktif) {
      b.hataBildir(t("sembol.izolasyonYok"));
      return;
    }
    if (sembolBitir(b.depo.belge, b.secim, b.gecmis))
      bildirimServisi.bildir(t("sembol.izolasyonBitti"), "bilgi");
  },
});
