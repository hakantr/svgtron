import { menuKayitDefteri } from "../../../cekirdek/registry/menu-registry";
import { izgara } from "../../tuval/izgara";
import { kilavuzDeposu } from "../../tuval/kilavuz-deposu";
import { bildirimServisi } from "../../kabuk/bildirim-servisi";
import { t } from "../../diller/dil";

/**
 * Görünüm eylemleri (TK-37 #2, İlke 5) — görünüm durumu (Command üretmez, undo'ya
 * girmez). Şimdilik: ızgarayı aç/kapat. Tuval ızgara deposunu dinler, kendini çizer.
 */
menuKayitDefteri.kaydet({
  id: "gorunum.izgara",
  grup: "gorunum",
  etiketAnahtari: "menu.gorunum.izgara",
  sira: 10,
  calistir: () => {
    izgara.degistir();
    bildirimServisi.bildir(
      izgara.gorunur ? t("izgara.acik") : t("izgara.kapali"),
      "bilgi",
    );
  },
});

menuKayitDefteri.kaydet({
  id: "gorunum.cetvel",
  grup: "gorunum",
  etiketAnahtari: "menu.gorunum.cetvel",
  sira: 20,
  calistir: () => {
    kilavuzDeposu.cetvelDegistir();
    bildirimServisi.bildir(
      kilavuzDeposu.cetvel ? t("cetvel.acik") : t("cetvel.kapali"),
      "bilgi",
    );
  },
});
