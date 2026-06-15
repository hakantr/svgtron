import type { BelgeDeposu } from "../belge/belge-deposu";
import type { SecimDeposu } from "../secim/secim-deposu";
import type { KomutGecmisi } from "../komutlar/komut-gecmisi";

/**
 * Menü kayıt defteri (AGENTS.md İlke 5, §6).
 *
 * Hamburger menüsündeki eylemler kabuğa GÖMÜLMEZ; özellikler buraya kaydolur.
 * Yeni eylem (Aç, Kaydet, Dışa Aktar...) = bu deftere bir öge eklemek.
 *
 * Etiketler i18n anahtarıdır (örn. 'menu.dosya.ac'); kabuk/menü bileşeni bunu
 * çalışma anında çevirir.
 */

/** Menü eylemine geçirilen bağlam (uygulama servisleri + kabuk geri çağrıları). */
export interface MenuBaglami {
  readonly depo: BelgeDeposu;
  readonly secim: SecimDeposu;
  readonly gecmis: KomutGecmisi;
  /** Eylem sırasında oluşan hatayı kabukta göstermek için. */
  hataBildir(mesaj: string): void;
}

/** Bir menü ögesi. */
export interface MenuOgesi {
  /** Benzersiz kimlik (örn. 'dosya.ac'). */
  readonly id: string;
  /** Grup kimliği; i18n başlığı 'menu.grup.<grup>' anahtarından gelir. */
  readonly grup: string;
  /** Etiketin i18n anahtarı (örn. 'menu.dosya.ac'). */
  readonly etiketAnahtari: string;
  /** Grup içi sıralama (küçük önce). Varsayılan 0. */
  readonly sira?: number;
  /** Tıklanınca çalışır. */
  calistir(baglam: MenuBaglami): void | Promise<void>;
}

class MenuKayitDefteri {
  readonly #ogeler: MenuOgesi[] = [];

  kaydet(oge: MenuOgesi): void {
    if (this.#ogeler.some((o) => o.id === oge.id)) {
      throw new Error(`Menü ögesi zaten kayıtlı: ${oge.id}`);
    }
    this.#ogeler.push(oge);
  }

  /** Bir menü ögesini id ile bulur (örn. Hızlı Eylemler şeridi için). */
  bul(id: string): MenuOgesi | undefined {
    return this.#ogeler.find((o) => o.id === id);
  }

  /** Ögeleri gruplara böler; grup sırası ilk-görülme, öge sırası `sira`'ya göre. */
  gruplar(): { grup: string; ogeler: MenuOgesi[] }[] {
    const sira: string[] = [];
    const harita = new Map<string, MenuOgesi[]>();
    for (const oge of this.#ogeler) {
      if (!harita.has(oge.grup)) {
        harita.set(oge.grup, []);
        sira.push(oge.grup);
      }
      harita.get(oge.grup)!.push(oge);
    }
    return sira.map((grup) => ({
      grup,
      ogeler: harita
        .get(grup)!
        .slice()
        .sort((a, b) => (a.sira ?? 0) - (b.sira ?? 0)),
    }));
  }
}

/** Uygulama genelinde tek menü kayıt defteri. */
export const menuKayitDefteri = new MenuKayitDefteri();
