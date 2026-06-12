import { gez, type Dugum } from "./model/dugum";
import { iceAktar } from "./model/ice-aktar";
import { disaAktar, type DisaAktarimProfili } from "./model/disa-aktar";
import { konumOku } from "./konum";
import { TanimlarModeli } from "./tanimlar/tanimlar-modeli";
import { ReferansIndeksi } from "./tanimlar/referans-indeksi";

/** Bir nesnenin sabit (baseline) konumu (AGENTS.md §9.8). */
export interface TemelKonum {
  readonly sx: number;
  readonly sy: number;
}

/** Belge değişikliklerine abone olan dinleyici. */
export type BelgeDinleyici = () => void;

/**
 * SVG belge modeli — uygulamanın TEK doğruluk kaynağı (AGENTS.md İlke 3).
 *
 * İçerik, canlı SVG DOM'u değil; sürümden bağımsız, normalize bir soyut düğüm
 * ağacıdır (İlke 8). Yalnızca web platform API'lerine dayanır; Electron'dan
 * habersizdir (İlke 1) — tarayıcıda ve testte de çalışır.
 *
 * Düzenleme yalnızca komutlarla (İlke 2): komut düğümleri değiştirip
 * {@link bildir} ile görünümleri uyarır (İlke 3). Görünümler modeli OKUR ve
 * DOM'a yansıtır.
 */
export class Belge {
  /** Belge modelinin kök düğümü (`svg`). */
  readonly kok: Dugum;
  /** `<defs>`/`<style>` yapısal modeli (§7.5). İçerik yerinde değişince yeniden kurulur. */
  #tanimlar: TanimlarModeli;

  #referansIndeksi: ReferansIndeksi;
  /** Komut sonrası (bildir) indeks bayatlar; erişimde tembel yeniden kurulur. */
  #indeksKirli = false;
  readonly #kimlikIndeksi = new Map<string, Dugum>();
  /** §9.8: dosya açılışında her konumlu nesne için sx←x, sy←y. */
  readonly #temelKonum = new Map<Dugum, TemelKonum>();
  readonly #dinleyiciler = new Set<BelgeDinleyici>();

  private constructor(kok: Dugum) {
    this.kok = kok;
    for (const dugum of gez(kok)) {
      this.#kimlikIndeksi.set(dugum.kimlik, dugum);
      const konum = konumOku(dugum);
      if (konum) this.#temelKonum.set(dugum, { sx: konum.x, sy: konum.y });
    }
    this.#tanimlar = new TanimlarModeli(kok);
    this.#referansIndeksi = new ReferansIndeksi(kok);
  }

  /** `<defs>`/`<style>` yapısal modeli (§7.5). */
  get tanimlar(): TanimlarModeli {
    return this.#tanimlar;
  }

  /**
   * Belgenin TÜM içeriğini (kök etiket + öznitelikler + çocuklar) YERİNDE değiştirir.
   * Aynı Belge örneği korunur → "SVG Kodu" panelinin "Uygula"sı bir Command olarak
   * geri-alınabilir (İlke 2): eski düğümler referansla saklanıp geri yüklenebilir;
   * önceki komutlar geçmişte geçerli kalır. İç indeksler (kimlik, baseline, tanımlar,
   * referans) yeniden kurulur ve dinleyiciler uyarılır (İlke 3).
   *
   * Not: kök düğüm NESNESİ aynı kalır; yalnız alanları mutasyona uğrar (kok readonly
   * referans, ama alanları yazılabilir).
   */
  icerikDegistir(
    etiket: string,
    oznitelikler: ReadonlyMap<string, string>,
    cocuklar: readonly Dugum[],
  ): void {
    this.kok.etiket = etiket;
    this.kok.oznitelikler.clear();
    for (const [ad, deger] of oznitelikler)
      this.kok.oznitelikler.set(ad, deger);
    this.kok.cocuklar.length = 0;
    this.kok.cocuklar.push(...cocuklar);

    this.#kimlikIndeksi.clear();
    this.#temelKonum.clear();
    for (const dugum of gez(this.kok)) {
      this.#kimlikIndeksi.set(dugum.kimlik, dugum);
      const konum = konumOku(dugum);
      if (konum) this.#temelKonum.set(dugum, { sx: konum.x, sy: konum.y });
    }
    this.#tanimlar = new TanimlarModeli(this.kok);
    this.#indeksKirli = true; // referans indeksi erişimde tazelenir
    this.bildir();
  }

  /**
   * "Hangi şekil hangi kaynağı kullanıyor" indeksi (İlke 7). Komut sonrası
   * bayatlar; ilk erişimde tembel olarak yeniden kurulur (O(n), yalnız değişiklik
   * sonrası ilk okumada — sık `bildir`'de boşuna kurulmaz).
   */
  get referansIndeksi(): ReferansIndeksi {
    if (this.#indeksKirli) {
      this.#referansIndeksi = new ReferansIndeksi(this.kok);
      this.#indeksKirli = false;
    }
    return this.#referansIndeksi;
  }

  /**
   * SVG metnini içe aktarıp (normalize ederek) belge oluşturur.
   * @throws Geçersiz/ayrıştırılamayan SVG'de hata fırlatır.
   */
  static svgMetninden(metin: string): Belge {
    return new Belge(iceAktar(metin));
  }

  /** Kimliğe göre düğüm bulur (seçim/DOM eşlemesi için). */
  dugumBul(kimlik: string): Dugum | undefined {
    return this.#kimlikIndeksi.get(kimlik);
  }

  /** Bir düğümün ebeveynini bulur (yoksa/kök ise null). */
  ebeveyn(dugum: Dugum): Dugum | null {
    for (const d of gez(this.kok)) {
      if (d.cocuklar.includes(dugum)) return d;
    }
    return null;
  }

  /** Düğümü ve alt ağacını kimlik indeksine ekler (düğüm ekleme komutları için). */
  indeksEkle(dugum: Dugum): void {
    for (const d of gez(dugum)) this.#kimlikIndeksi.set(d.kimlik, d);
  }

  /** Düğümü ve alt ağacını kimlik indeksinden çıkarır. */
  indeksCikar(dugum: Dugum): void {
    for (const d of gez(dugum)) this.#kimlikIndeksi.delete(d.kimlik);
  }

  /** Düğümün sabit (baseline) konumu (§9.8); konumlu değilse undefined. */
  temelKonum(dugum: Dugum): TemelKonum | undefined {
    return this.#temelKonum.get(dugum);
  }

  /** Modeli, verilen profile göre SVG metnine dışa aktarır (İlke 8). */
  disaAktar(profil?: DisaAktarimProfili): string {
    return disaAktar(this.kok, profil);
  }

  /** Değişikliklere abone olur; aboneliği iptal eden fonksiyonu döndürür. */
  dinle(dinleyici: BelgeDinleyici): () => void {
    this.#dinleyiciler.add(dinleyici);
    return () => this.#dinleyiciler.delete(dinleyici);
  }

  /**
   * Dinleyicileri uyarır. Bunu YALNIZCA komutlar (İlke 2), modeli değiştirdikten
   * sonra çağırmalıdır.
   */
  bildir(): void {
    this.#indeksKirli = true; // referans indeksi bir sonraki erişimde tazelenir
    for (const dinleyici of this.#dinleyiciler) dinleyici();
  }
}
