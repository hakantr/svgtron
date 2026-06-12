import {
  menuKayitDefteri,
  type MenuBaglami,
} from "../../../cekirdek/registry/menu-registry";
import {
  yoluAyristir,
  yoluYaz,
  type Segment,
} from "../../../cekirdek/belge/model/yol";
import {
  yoluTersCevir,
  yoluBasitlestir,
} from "../../../cekirdek/belge/model/yol-duzenleme";
import { OznitelikDegistirKomutu } from "../../../cekirdek/komutlar/oznitelik-degistir-komutu";
import { BilesikKomut } from "../../../cekirdek/komutlar/dugum-komutlari";
import type { Komut } from "../../../cekirdek/komutlar/komut";

/**
 * Yol düzenleme menü eylemleri (§11.2) — seçili `<path>`'leri tersine çevir /
 * basitleştir. "Yol" grubunda (registry → menü + Komut Paleti, İlke 5). Her biri
 * `d`'yi tek Command'la yazar (İlke 2).
 */
function pathlariDonustur(
  baglam: MenuBaglami,
  donustur: (s: Segment[]) => Segment[],
  etiket: string,
): void {
  const belge = baglam.depo.belge;
  if (!belge) return;
  const komutlar: Komut[] = [];
  for (const d of baglam.secim.secililer) {
    if (d.etiket !== "path") continue;
    const ham = d.oznitelikler.get("d");
    if (!ham) continue;
    let segs: Segment[];
    try {
      segs = yoluAyristir(ham);
    } catch {
      continue;
    }
    komutlar.push(
      new OznitelikDegistirKomutu(belge, d, "d", yoluYaz(donustur(segs))),
    );
  }
  if (komutlar.length)
    baglam.gecmis.calistir(new BilesikKomut(etiket, komutlar));
}

menuKayitDefteri.kaydet({
  id: "yol.tersCevir",
  grup: "yol",
  etiketAnahtari: "menu.yol.tersCevir",
  sira: 4,
  calistir: (b) => pathlariDonustur(b, yoluTersCevir, "yolu tersine çevir"),
});

menuKayitDefteri.kaydet({
  id: "yol.basitlestir",
  grup: "yol",
  etiketAnahtari: "menu.yol.basitlestir",
  sira: 5,
  calistir: (b) =>
    pathlariDonustur(b, (s) => yoluBasitlestir(s, 1.5), "yolu basitleştir"),
});
