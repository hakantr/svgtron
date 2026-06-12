import type { TemplateResult } from 'lit';
import type { BelgeDeposu } from '../belge/belge-deposu';
import type { SecimDeposu } from '../secim/secim-deposu';
import type { KomutGecmisi } from '../komutlar/komut-gecmisi';
import type { OynatmaDeposu } from '../animasyon/oynatma-deposu';

/**
 * Panel kayıt defteri (CLAUDE.md İlke 5).
 *
 * Kabuk (shell) hangi panellerin var olduğunu bilmez; panelleri buradan okuyup
 * bölgelere yerleştirir. Yeni panel eklemek = bu deftere kaydolmak; kabuk kodu
 * hiç değişmez.
 */

/**
 * Panelin yerleşeceği bölge (CLAUDE.md §9.1):
 * sol=Araçlar · merkez=Tuval · sag=Denetçi+Tanımlar · alt=Zaman Çizelgesi.
 */
export type PanelBolgesi = 'sol' | 'merkez' | 'sag' | 'alt';

/** Panel oluşturulurken verilen bağlam (uygulama servisleri). */
export interface PanelBaglami {
  readonly depo: BelgeDeposu;
  readonly secim: SecimDeposu;
  readonly gecmis: KomutGecmisi;
  readonly oynatma: OynatmaDeposu;
}

/** Bir panel kaydı. */
export interface PanelKaydi {
  /** Benzersiz kimlik (örn. 'gozlemleyici'). */
  readonly id: string;
  /** İnsan-okur başlık. */
  readonly baslik: string;
  /** Yerleşeceği bölge. */
  readonly bolge: PanelBolgesi;
  /**
   * Sağ ray simgesi (SVG, opsiyonel). Verilmezse kabuk başlığın ilk harfini
   * gösterir. Lit `TemplateResult` (yalnız tip import; çekirdeğe runtime bağımlılık
   * eklemez — kayıt zaten DOM `HTMLElement` döndürüyor).
   */
  readonly ikon?: TemplateResult;
  /** Panel DOM düğümünü üretir. */
  olustur(baglam: PanelBaglami): HTMLElement;
}

class PanelKayitDefteri {
  readonly #kayitlar: PanelKaydi[] = [];

  kaydet(kayit: PanelKaydi): void {
    if (this.#kayitlar.some((k) => k.id === kayit.id)) {
      throw new Error(`Panel zaten kayıtlı: ${kayit.id}`);
    }
    this.#kayitlar.push(kayit);
  }

  bolgedekiler(bolge: PanelBolgesi): readonly PanelKaydi[] {
    return this.#kayitlar.filter((k) => k.bolge === bolge);
  }

  hepsi(): readonly PanelKaydi[] {
    return this.#kayitlar;
  }
}

/** Uygulama genelinde tek panel kayıt defteri. */
export const panelKayitDefteri = new PanelKayitDefteri();
