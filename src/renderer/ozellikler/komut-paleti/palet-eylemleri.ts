import {
  menuKayitDefteri,
  type MenuBaglami,
} from "../../../cekirdek/registry/menu-registry";
import { aracKayitDefteri, aracDeposu } from "../../araclar/arac";
import { t } from "../../diller/dil";

/** Palette'te aranıp çalıştırılabilen tek bir eylem. */
export interface PaletEylem {
  readonly id: string;
  readonly etiket: string;
  readonly ipucu: string;
  calistir(): void | Promise<void>;
}

const trKucuk = (s: string): string => s.toLocaleLowerCase("tr");

/**
 * Tüm kayıtlı araç + menü eylemleri (registry'den; İlke 5). Komut araması (üst
 * çubuk) bunları listeler — hiçbir özelliği bilmez, yalnız kayıt defterlerini
 * okur; yeni araç/menü ögesi otomatik belirir.
 */
export function paletEylemleri(baglam: MenuBaglami): PaletEylem[] {
  const araclar: PaletEylem[] = aracKayitDefteri.hepsi().map((a) => ({
    id: `arac:${a.id}`,
    etiket: t(a.etiketAnahtari),
    ipucu: t("komutpalet.arac"),
    calistir: () => aracDeposu.ayarla(a.id),
  }));
  const menuler: PaletEylem[] = menuKayitDefteri.gruplar().flatMap((g) =>
    g.ogeler.map((oge) => ({
      id: `menu:${oge.id}`,
      etiket: t(oge.etiketAnahtari),
      ipucu: t(`menu.grup.${g.grup}`),
      calistir: () => oge.calistir(baglam),
    })),
  );
  return [...araclar, ...menuler];
}

/** Sorguya göre süzer (etiket veya ipucu içinde, Türkçe küçük harf). */
export function paletSuz(eylemler: PaletEylem[], sorgu: string): PaletEylem[] {
  const q = trKucuk(sorgu.trim());
  if (!q) return eylemler;
  return eylemler.filter(
    (e) => trKucuk(e.etiket).includes(q) || trKucuk(e.ipucu).includes(q),
  );
}
