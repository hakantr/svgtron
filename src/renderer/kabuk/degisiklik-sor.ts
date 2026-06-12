/**
 * Kaydedilmemiş değişiklik sorusu servisi (görünüm durumu, İlke 9).
 *
 * "Yeni / Aç / Son Dosya / Pencereyi Kapat" akışları, kaydedilmemiş değişiklik
 * varken kullanıcıya **Kaydet / Kaydetme / İptal** sorar. Bu singleton soruyu
 * açar ve cevabı bir Promise ile çözer; kabuk (uygulama-kabugu) modalı çizer ve
 * kullanıcı tıklayınca {@link cevapla}'yı çağırır.
 *
 * Eşzamanlı çağrılar KUYRUĞA alınır: bir soru açıkken gelen ikinci `sor()` (örn.
 * menü modalı açıkken pencere kapanış isteği) kaybolmaz — öncekinin cevabı verilince
 * kendi modalını açar. Böylece kapanış isteği sessizce yutulmaz.
 */
export type KaydetCevap = 'kaydet' | 'kaydetme' | 'iptal';

class DegisiklikSor {
  #cozumle: ((c: KaydetCevap) => void) | null = null;
  #dinleyici: ((acik: boolean) => void) | null = null;
  /** Sıraya alınmış soruların zinciri (öncekisi bitmeden sonraki açılmaz). */
  #kuyruk: Promise<unknown> = Promise.resolve();

  /** Şu an bir soru açık mı? (kabuk modalı buna göre çizer.) */
  get acik(): boolean {
    return this.#cozumle !== null;
  }

  /** Soruyu (sıraya alarak) gösterir; kullanıcı cevabını (kaydet/kaydetme/iptal) çözer. */
  sor(): Promise<KaydetCevap> {
    const sonuc = this.#kuyruk.then(
      () =>
        new Promise<KaydetCevap>((res) => {
          this.#cozumle = res;
          this.#dinleyici?.(true);
        }),
    );
    this.#kuyruk = sonuc.catch(() => undefined); // zincir kopmasın
    return sonuc;
  }

  /** Modal düğmesi tıklanınca çağrılır; bekleyen Promise'i çözer. */
  cevapla(cevap: KaydetCevap): void {
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

/** Uygulama geneli kaydetme-sorusu servisi. */
export const degisiklikSor = new DegisiklikSor();
