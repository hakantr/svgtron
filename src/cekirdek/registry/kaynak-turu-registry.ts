import type { Belge } from "../belge/belge";
import type { Dugum } from "../belge/model/dugum";
import type { Komut } from "../komutlar/komut";

/**
 * Kaynak türü kayıt defteri (AGENTS.md §8.1 — tek desen, çok tür).
 *
 * Sağ paneldeki her grup, buraya kayıtlı bir "kaynak türü" tarafından sürülür.
 * Her tür dört şey sağlar (fazlasını değil): listele · düzenle · uygula · önizle.
 * Önizleme ayrı iş değildir (İlke 3): komut belgeyi değiştirince Tuval ve
 * düzenleyici otomatik tepki verir.
 *
 * Yeni tür eklemek = bu deftere kaydolmak; kabuk/sağ panel değişmez (İlke 5).
 */

/** Listede gösterilecek tek bir kaynak. */
export interface KaynakOgesi {
  /** Kaynağın id'si (örn. filter/gradient id'si) ya da sınıf adı. */
  readonly id: string;
  /** Listede gösterilecek etiket. */
  readonly etiket: string;
}

/** Bir kaynak türü sözleşmesi. */
export interface KaynakTuru {
  /** Tür kimliği (örn. 'filter', 'linearGradient', 'stil'). */
  readonly id: string;
  /** Sağ panelde grup başlığı. */
  readonly etiket: string;
  /**
   * Kaynağa nasıl atıf verilir: `url(#id)` (varsayılan) ya da `class` listesi
   * (stil sınıfları). Güvenli silmenin doğru referansları (kullananlar vs
   * sinifiKullananlar) bulması için. Belirtilmezse 'url' kabul edilir.
   */
  readonly referansTuru?: "url" | "sinif";
  /** Belgedeki bu türden kaynakları döndürür. */
  listele(belge: Belge): KaynakOgesi[];
  /** Kaynağı seçili düğümlere iliştiren komut (uygulama stratejisi). */
  uygula?(
    belge: Belge,
    dugumler: readonly Dugum[],
    kaynakId: string,
  ): Komut | null;
  /** Yeni bir kaynak oluşturan komut. */
  olustur?(belge: Belge): Komut | null;
  /** Bir kaynağı silen komut. */
  sil?(belge: Belge, kaynakId: string): Komut | null;
}

class KaynakTuruKayitDefteri {
  readonly #turler: KaynakTuru[] = [];

  kaydet(tur: KaynakTuru): void {
    if (this.#turler.some((t) => t.id === tur.id)) {
      throw new Error(`Kaynak türü zaten kayıtlı: ${tur.id}`);
    }
    this.#turler.push(tur);
  }

  hepsi(): readonly KaynakTuru[] {
    return this.#turler;
  }

  /** Kimliğe göre bir kaynak türü (yoksa undefined). */
  al(id: string): KaynakTuru | undefined {
    return this.#turler.find((t) => t.id === id);
  }
}

/** Uygulama genelinde tek kaynak türü kayıt defteri (başlangıçta boş). */
export const kaynakTuruKayitDefteri = new KaynakTuruKayitDefteri();
