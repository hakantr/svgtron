/**
 * Tema kayıt defteri (AGENTS.md İlke 5).
 *
 * Temalar da paneller/araçlar gibi "fiş tak-çalıştır" mantığıyla buraya kaydolur;
 * kabuk hangi temaların var olduğunu bilmez, yalnızca defteri okur. Yeni tema
 * eklemek = bu deftere bir kayıt eklemek.
 *
 * Bir tema, aşağıdaki TASARIM TOKEN'larının (CSS değişkenleri) değerlerini verir.
 * Bileşenler renk sabiti yazmaz; `var(--token)` kullanır. Token'lar belge köküne
 * yazıldığında Shadow DOM sınırlarını delip tüm bileşenlere ulaşır.
 */

/**
 * Tema değişkenleri (tasarım token'ları) sözleşmesi.
 *
 * `background` olarak kullanılanlar (zemin/yüzey/vurgu/tuval) düz renk VEYA
 * gradient olabilir; `color`/`border` olanlar düz renktir.
 */
export interface TemaDegiskenleri {
  /** Uygulama arka planı (tam ekranı kaplar). */
  "--zemin": string;
  /** Bar ve panel yüzeyi. */
  "--yuzey": string;
  /** İkincil yüzey (grup başlıkları vb.). */
  "--yuzey-2": string;
  /** Üzerine gelince (hover) yüzey. */
  "--yuzey-hover": string;
  /** Kenarlık / ayraç rengi. */
  "--kenarlik": string;
  /** Birincil metin. */
  "--metin": string;
  /** Soluk/ikincil metin. */
  "--metin-soluk": string;
  /** Vurgu (birincil düğme arka planı). */
  "--vurgu": string;
  /** Vurgu üzerine gelince. */
  "--vurgu-hover": string;
  /** Vurgu üzerindeki metin. */
  "--vurgu-metin": string;
  /** Hata metni. */
  "--hata": string;
  /** Gözlemleyici tuvali dama deseni — açık kare. */
  "--tuval-1": string;
  /** Gözlemleyici tuvali dama deseni — koyu kare. */
  "--tuval-2": string;
}

/** Bir tema kaydı. */
export interface Tema {
  /** Benzersiz kimlik (örn. 'metal', 'nord'). */
  readonly id: string;
  /** Menüde gösterilecek ad. */
  readonly etiket: string;
  /** Açık mı koyu mu (ileride otomatik seçim için ipucu). */
  readonly tur: "koyu" | "acik";
  /** Token değerleri. */
  readonly degiskenler: TemaDegiskenleri;
}

class TemaKayitDefteri {
  readonly #temalar: Tema[] = [];

  kaydet(tema: Tema): void {
    if (this.#temalar.some((t) => t.id === tema.id)) {
      throw new Error(`Tema zaten kayıtlı: ${tema.id}`);
    }
    this.#temalar.push(tema);
  }

  bul(id: string): Tema | undefined {
    return this.#temalar.find((t) => t.id === id);
  }

  hepsi(): readonly Tema[] {
    return this.#temalar;
  }
}

/** Uygulama genelinde tek tema kayıt defteri. */
export const temaKayitDefteri = new TemaKayitDefteri();
