import type { DisaAktarimProfili } from "../../../cekirdek/belge/model/disa-aktar";

/**
 * Dışa aktarım profili seçim servisi (görünüm durumu, İlke 9 — TK-37 #10).
 *
 * "Dışa aktar" akışı, çıktıyı hangi profile göre üreteceğini kullanıcıya sorar:
 *  - `blink`            → Uygulama-içi: en modern/kısa; editör durumunu (kilit,
 *                         artboard) İlke 10 yorumlarıyla KORUR.
 *  - `genis-uyumluluk`  → Safari dahil her yerde render olan güvenli alt küme;
 *                         editör yorumları AYIKLANIR.
 *
 * Seçim yalnız bir dışa-aktarım ayarıdır; doğal kaydetme SVG'de kalır (TK-37 #10).
 * Servis belge modeline dokunmaz, Command üretmez, undo'ya GİRMEZ.
 *
 * Mekanik {@link degisiklikSor} ile aynıdır: singleton soruyu açar, cevabı bir
 * Promise ile çözer; kabuk (uygulama-kabugu) modalı çizip {@link cevapla}'yı çağırır.
 * Eşzamanlı çağrılar kuyruğa alınır (önceki cevaplanmadan sonraki açılmaz).
 */
export type DisaAktarCevap = DisaAktarimProfili | null; // null = iptal

class DisaAktarSor {
  #cozumle: ((c: DisaAktarCevap) => void) | null = null;
  #dinleyici: ((acik: boolean) => void) | null = null;
  /** Sıraya alınmış soruların zinciri (öncekisi bitmeden sonraki açılmaz). */
  #kuyruk: Promise<unknown> = Promise.resolve();

  /** Şu an bir soru açık mı? (kabuk modalı buna göre çizer.) */
  get acik(): boolean {
    return this.#cozumle !== null;
  }

  /** Soruyu (sıraya alarak) gösterir; kullanıcının seçtiği profili (ya da iptal=null) çözer. */
  sor(): Promise<DisaAktarCevap> {
    const sonuc = this.#kuyruk.then(
      () =>
        new Promise<DisaAktarCevap>((res) => {
          this.#cozumle = res;
          this.#dinleyici?.(true);
        }),
    );
    this.#kuyruk = sonuc.catch(() => undefined); // zincir kopmasın
    return sonuc;
  }

  /** Modal düğmesi tıklanınca çağrılır; bekleyen Promise'i çözer. */
  cevapla(cevap: DisaAktarCevap): void {
    const coz = this.#cozumle;
    this.#cozumle = null;
    this.#dinleyici?.(false);
    coz?.(cevap);
  }

  /** Kabuk, açık/kapalı değişimine abone olur (modalı göster/gizle). */
  dinle(fn: (acik: boolean) => void): () => void {
    this.#dinleyici = fn;
    return () => {
      if (this.#dinleyici === fn) this.#dinleyici = null;
    };
  }
}

/** Uygulama geneli dışa-aktarım profili sorusu servisi. */
export const disaAktarSor = new DisaAktarSor();
