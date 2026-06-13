import {
  menuKayitDefteri,
  type MenuBaglami,
} from "../../../cekirdek/registry/menu-registry";
import {
  benzersizId,
  type Dugum,
} from "../../../cekirdek/belge/model/dugum";
import {
  BilesikKomut,
  DugumDegistirKomutu,
} from "../../../cekirdek/komutlar/dugum-komutlari";
import { OznitelikDegistirKomutu } from "../../../cekirdek/komutlar/oznitelik-degistir-komutu";
import type { Komut } from "../../../cekirdek/komutlar/komut";
import { secimKaydiBastir } from "../../../cekirdek/secim/secim-kayit-bastir";
import { metniYolaSar, metniYoldanCoz } from "./metin-yol";
import { t } from "../../diller/dil";

/**
 * Metin eylemleri (TK-37 #6, İlke 5): "Yola Bağla" (`textPath`) ve "Yoldan Çöz".
 * Yapısal düzenlemeler tek BilesikKomut'tur (İlke 2 → geri-alınır). SVG fontları
 * üretilmez (§10.2); yalnız metnin bir yola akıtılması kurulur. Saf dönüşümler
 * `metin-yol.ts`'de (birim testli); burası onları Command'a sarar.
 */

/** Seçimde tek bir `<text>` ve tek bir `<path>` var mı? (bind ön koşulu.) */
function metinVeYol(
  baglam: MenuBaglami,
): { text: Dugum; path: Dugum } | null {
  const sec = baglam.secim.secililer;
  if (sec.length !== 2) return null;
  const text = sec.find((d) => d.etiket === "text");
  const path = sec.find((d) => d.etiket === "path");
  return text && path ? { text, path } : null;
}

/** "Yola Bağla": seçili text'i seçili path'e akıt (textPath). */
function yolaBagla(baglam: MenuBaglami): void {
  const belge = baglam.depo.belge;
  if (!belge) return;
  const cift = metinVeYol(baglam);
  if (!cift) {
    baglam.hataBildir(t("metin.yolaBaglaGecersiz"));
    return;
  }
  const ebeveyn = belge.ebeveyn(cift.text);
  if (!ebeveyn) return;

  const komutlar: Komut[] = [];
  let pathId = cift.path.oznitelikler.get("id");
  if (!pathId) {
    pathId = benzersizId(belge.kok, "yol");
    komutlar.push(new OznitelikDegistirKomutu(belge, cift.path, "id", pathId));
  }
  const yeniText = metniYolaSar(cift.text, pathId);
  komutlar.push(new DugumDegistirKomutu(belge, ebeveyn, cift.text, yeniText));

  secimKaydiBastir(() => {
    baglam.gecmis.calistir(new BilesikKomut("yola bağla", komutlar));
    baglam.secim.sec(yeniText);
  });
}

/** "Yoldan Çöz": seçili text'teki textPath bağını çöz. */
function yoldanCoz(baglam: MenuBaglami): void {
  const belge = baglam.depo.belge;
  if (!belge) return;
  const sec = baglam.secim.secililer;
  const text = sec.length === 1 ? sec[0] : undefined;
  const yeniText = text ? metniYoldanCoz(text) : null;
  if (!text || !yeniText) {
    baglam.hataBildir(t("metin.yoldanCozGecersiz"));
    return;
  }
  const ebeveyn = belge.ebeveyn(text);
  if (!ebeveyn) return;
  secimKaydiBastir(() => {
    baglam.gecmis.calistir(
      new DugumDegistirKomutu(belge, ebeveyn, text, yeniText),
    );
    baglam.secim.sec(yeniText);
  });
}

menuKayitDefteri.kaydet({
  id: "metin.yolaBagla",
  grup: "metin",
  etiketAnahtari: "menu.metin.yolaBagla",
  sira: 10,
  calistir: (baglam) => yolaBagla(baglam),
});

menuKayitDefteri.kaydet({
  id: "metin.yoldanCoz",
  grup: "metin",
  etiketAnahtari: "menu.metin.yoldanCoz",
  sira: 20,
  calistir: (baglam) => yoldanCoz(baglam),
});
