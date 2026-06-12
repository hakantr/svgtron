import type { TemplateResult } from "lit";
import type { Dugum } from "../../../../cekirdek/belge/model/dugum";
import type { Belge } from "../../../../cekirdek/belge/belge";
import type { Komut } from "../../../../cekirdek/komutlar/komut";

/**
 * Alan seti kayıt defteri (AGENTS.md §9.3 — seçime duyarlı denetçi).
 *
 * Özellik Denetçisi bir nesne türü değil, bir DAVRANIŞtır: Tuval'de ne
 * seçildiyse, türüne uygun "alan setlerini" gösterir. Her alan seti registry'ye
 * kaydolur; yeni nesne türü = yeni alan seti kaydı, kabuk/panel değişmez (İlke 5).
 */

/** Bir alan setine geçirilen bağlam. */
export interface AlanSetiBaglami {
  /** Seçili düğüm. */
  readonly dugum: Dugum;
  /** İçinde bulunduğu belge (baseline/§9.8 vb. için). */
  readonly belge: Belge;
  /** Bir özniteliği komutla yazar (İlke 2). Değişmediyse komut üretmez. */
  yaz(ad: string, deger: string): void;
  /** Hazır bir komutu geçmiş üzerinden çalıştırır (örn. gradyan uygulama). */
  komut(k: Komut): void;
  /** Paneli yeniden çizdirir (yerel UI durumu değişince; örn. kilit toggle). */
  tazele(): void;
}

/** Seçili düğümün türüne göre gösterilen bir alan kümesi. */
export interface AlanSeti {
  /** Benzersiz kimlik. */
  readonly id: string;
  /** Grup başlığının i18n anahtarı (örn. 'denetci.grup.gorunum'). */
  readonly baslikAnahtari: string;
  /** Sıralama (küçük önce). Varsayılan 0. */
  readonly sira?: number;
  /** Bu düğüm için bu alan seti uygun mu? */
  uygunMu(dugum: Dugum): boolean;
  /** Alanları çizer (Lit şablonu). */
  render(baglam: AlanSetiBaglami): TemplateResult;
}

class AlanSetiKayitDefteri {
  readonly #setler: AlanSeti[] = [];

  kaydet(set: AlanSeti): void {
    if (this.#setler.some((s) => s.id === set.id)) {
      throw new Error(`Alan seti zaten kayıtlı: ${set.id}`);
    }
    this.#setler.push(set);
  }

  /** Verilen düğüme uygun alan setleri (sıraya göre). */
  uygunlar(dugum: Dugum): AlanSeti[] {
    return this.#setler
      .filter((s) => s.uygunMu(dugum))
      .sort((a, b) => (a.sira ?? 0) - (b.sira ?? 0));
  }
}

/** Uygulama genelinde tek alan seti kayıt defteri. */
export const alanSetiKayitDefteri = new AlanSetiKayitDefteri();
