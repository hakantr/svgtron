import {
  menuKayitDefteri,
  type MenuBaglami,
} from "../../../cekirdek/registry/menu-registry";
import { secimKaydiBastir } from "../../../cekirdek/secim/secim-kayit-bastir";
import { sil, cogalt, grupla, coz, type DuzenSonuc } from "./duzenleme";

/**
 * Düzen eylemleri (İlke 5, §6): Geri Al / İleri Al + Sil / Çoğalt / Grupla / Çöz.
 * Komut geçmişi üzerinden (İlke 2); kabuk klavye kısayollarını da aynı üreticilere
 * bağlar (Delete, Ctrl+D, Ctrl+G, Ctrl+Shift+G).
 */

/** Bir düzenleme üreticisini çalıştırır ve gerekirse seçimi günceller. */
export function duzenUygula(
  baglam: Pick<MenuBaglami, "depo" | "secim" | "gecmis">,
  uretici: (
    belge: import("../../../cekirdek/belge/belge").Belge,
    secim: typeof baglam.secim,
  ) => DuzenSonuc | null,
): void {
  const belge = baglam.depo.belge;
  if (!belge) return;
  const sonuc = uretici(belge, baglam.secim);
  if (!sonuc) return;
  // Düzenleme + onu izleyen seçim güncellemesi TEK kullanıcı eylemidir (§9.4): seçim
  // değişikliği seçim geçmişine AYRI bir adım yazmamalı (yoksa sil/çoğalt/grupla/çöz
  // iki ctrl+z gerektirir). Bastırma kapsamında yapılır; izleyici yalnız hizalar.
  secimKaydiBastir(() => {
    baglam.gecmis.calistir(sonuc.komut);
    if (sonuc.sonraSec) baglam.secim.cokluSec(sonuc.sonraSec);
  });
}

menuKayitDefteri.kaydet({
  id: "duzen.geriAl",
  grup: "duzen",
  etiketAnahtari: "menu.duzen.geriAl",
  sira: 10,
  calistir: ({ gecmis }) => gecmis.geriAl(),
});

menuKayitDefteri.kaydet({
  id: "duzen.ileriAl",
  grup: "duzen",
  etiketAnahtari: "menu.duzen.ileriAl",
  sira: 20,
  calistir: ({ gecmis }) => gecmis.ileriAl(),
});

menuKayitDefteri.kaydet({
  id: "duzen.cogalt",
  grup: "duzen",
  etiketAnahtari: "menu.duzen.cogalt",
  sira: 30,
  calistir: (baglam) => duzenUygula(baglam, cogalt),
});

menuKayitDefteri.kaydet({
  id: "duzen.sil",
  grup: "duzen",
  etiketAnahtari: "menu.duzen.sil",
  sira: 40,
  calistir: (baglam) => duzenUygula(baglam, sil),
});

menuKayitDefteri.kaydet({
  id: "duzen.grupla",
  grup: "duzen",
  etiketAnahtari: "menu.duzen.grupla",
  sira: 50,
  calistir: (baglam) => duzenUygula(baglam, grupla),
});

menuKayitDefteri.kaydet({
  id: "duzen.coz",
  grup: "duzen",
  etiketAnahtari: "menu.duzen.coz",
  sira: 60,
  calistir: (baglam) => duzenUygula(baglam, coz),
});
