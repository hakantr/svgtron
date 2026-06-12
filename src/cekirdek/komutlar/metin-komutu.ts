import type { Belge } from "../belge/belge";
import type { Dugum } from "../belge/model/dugum";
import type { Komut } from "./komut";

/**
 * Bir düğümün metin içeriğini değiştirir (örn. `<title>`/`<desc>` — Faz B).
 * Geri-alınabilir (İlke 2).
 */
export class MetinKomutu implements Komut {
  readonly etiket = "metin değiştir";
  readonly #eski: string | undefined;

  constructor(
    private readonly belge: Belge,
    private readonly dugum: Dugum,
    private readonly yeni: string,
  ) {
    this.#eski = dugum.metin;
  }

  uygula(): void {
    this.dugum.metin = this.yeni === "" ? undefined : this.yeni;
    this.belge.bildir();
  }

  geriAl(): void {
    this.dugum.metin = this.#eski;
    this.belge.bildir();
  }
}
