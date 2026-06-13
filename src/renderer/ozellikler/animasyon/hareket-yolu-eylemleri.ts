import {
  menuKayitDefteri,
  type MenuBaglami,
} from "../../../cekirdek/registry/menu-registry";
import { benzersizId } from "../../../cekirdek/belge/model/dugum";
import {
  BilesikKomut,
  DugumEkleKomutu,
} from "../../../cekirdek/komutlar/dugum-komutlari";
import { OznitelikDegistirKomutu } from "../../../cekirdek/komutlar/oznitelik-degistir-komutu";
import type { Komut } from "../../../cekirdek/komutlar/komut";
import { hareketYoluDugumu } from "./hareket-yolu";
import { t } from "../../diller/dil";

/**
 * Hareket yolu eylemi (TK-37 #4, İlke 5): seçili nesneyi seçili bir `<path>` boyunca
 * animateMotion ile oynatır. Hareket yolu = REFERANS (son seçilen, §9.6b) — kullanıcı
 * yolu en son/aktif seçerek hangi yolun olacağını belirler. Tek BilesikKomut (İlke 2).
 * Zaman Çizelgesi SMIL'i `Playback` arayüzüyle oynatır (oynatma deposu tazeler).
 */
function hareketYoluUygula(baglam: MenuBaglami): void {
  const belge = baglam.depo.belge;
  if (!belge) return;
  const sec = baglam.secim.secililer;
  const yol = baglam.secim.secili; // referans = hareket yolu
  const nesne = sec.length === 2 ? sec.find((d) => d !== yol) : undefined;
  if (!yol || yol.etiket !== "path" || !nesne) {
    baglam.hataBildir(t("animasyon.hareketYoluGecersiz"));
    return;
  }

  const komutlar: Komut[] = [];
  let pid = yol.oznitelikler.get("id");
  if (!pid) {
    pid = benzersizId(belge.kok, "yol");
    komutlar.push(new OznitelikDegistirKomutu(belge, yol, "id", pid));
  }
  komutlar.push(new DugumEkleKomutu(belge, nesne, hareketYoluDugumu(pid)));
  baglam.gecmis.calistir(new BilesikKomut("hareket yolu", komutlar));
}

menuKayitDefteri.kaydet({
  id: "animasyon.hareketYolu",
  grup: "animasyon",
  etiketAnahtari: "menu.animasyon.hareketYolu",
  sira: 10,
  calistir: (baglam) => hareketYoluUygula(baglam),
});
