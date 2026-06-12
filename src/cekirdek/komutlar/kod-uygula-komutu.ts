import type { Belge } from "../belge/belge";
import type { Dugum } from "../belge/model/dugum";
import { iceAktar } from "../belge/model/ice-aktar";
import type { Komut } from "./komut";

/**
 * "SVG Kodu" panelindeki "Uygula" işlemini GERİ-ALINABİLİR yapan komut (İlke 2).
 *
 * Belgeyi yeni bir örnekle DEĞİŞTİRMEK yerine (geçmişi kıracaktı), aynı Belge
 * örneğinin içeriğini yerinde değiştirir ({@link Belge.icerikDegistir}). Eski kök
 * etiketi/öznitelikleri/çocukları referansla saklanır; `geriAl` onları geri yükler
 * → ctrl+z koddaki değişikliği geri alır ve önceki komutlar geçmişte geçerli kalır.
 */
export class KodUygulaKomutu implements Komut {
  readonly etiket = "kod uygula";
  readonly #belge: Belge;
  readonly #yeniEtiket: string;
  readonly #yeniOzn: Map<string, string>;
  readonly #yeniCocuklar: Dugum[];
  readonly #eskiEtiket: string;
  readonly #eskiOzn: Map<string, string>;
  readonly #eskiCocuklar: Dugum[];

  /**
   * @param yeniSvgMetni Panelde düzenlenen ham SVG. Kurucuda ayrıştırılır.
   * @throws Geçersiz/ayrıştırılamayan SVG'de hata fırlatır (çağıran yakalamalı —
   *   böylece geçmişe geçersiz bir komut girmez).
   */
  constructor(belge: Belge, yeniSvgMetni: string) {
    this.#belge = belge;
    const yeniKok = iceAktar(yeniSvgMetni); // geçersizse fırlatır
    this.#yeniEtiket = yeniKok.etiket;
    this.#yeniOzn = new Map(yeniKok.oznitelikler);
    this.#yeniCocuklar = [...yeniKok.cocuklar];
    this.#eskiEtiket = belge.kok.etiket;
    this.#eskiOzn = new Map(belge.kok.oznitelikler);
    this.#eskiCocuklar = [...belge.kok.cocuklar];
  }

  uygula(): void {
    this.#belge.icerikDegistir(
      this.#yeniEtiket,
      this.#yeniOzn,
      this.#yeniCocuklar,
    );
  }

  geriAl(): void {
    this.#belge.icerikDegistir(
      this.#eskiEtiket,
      this.#eskiOzn,
      this.#eskiCocuklar,
    );
  }
}
