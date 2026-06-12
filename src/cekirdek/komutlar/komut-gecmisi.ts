import type { Komut } from './komut';

/**
 * Birleşik geçmiş girdisi (CLAUDE.md §9.6 d) — iki tür:
 *  - `duzenleme`: belge Command'ı (İlke 2), undo/redo'ya tam girer.
 *  - `secim`: belgeyi DEĞİŞTİRMEYEN seçim anlık görüntüsü (önceki/sonraki kimlik
 *    listeleri). Geri-al önceki seçimi, ileri-al sonraki seçimi geri yükler.
 */
export type Girdi =
  | { readonly tur: 'duzenleme'; readonly komut: Komut }
  | {
      readonly tur: 'secim';
      readonly onceki: readonly string[];
      readonly sonraki: readonly string[];
      readonly etiket: string;
    };

/** Geçmişte en çok tutulacak SEÇİM adımı sayısı (§9.6 e — kayan pencere). */
const SECIM_PENCERESI = 5;

/**
 * Komut geçmişi — BİRLEŞİK undo/redo zaman çizelgesi (CLAUDE.md İlke 2 + §9.6).
 *
 * Tek bir girdi listesi (`#girdiler`) + tek bir konum işaretçisi (`#konum`,
 * uygulanmış girdi sayısı) tutar. Liste iki tür girdi içerir: **düzenleme**
 * (belge Command'ı) ve **seçim** (belgeyi değiştirmeyen seçim anlık görüntüsü,
 * §9.6 d). `geriAl`/`ileriAl` bu birleşik listede gezer; bir düzenleme girdisinde
 * komutu uygular/geri alır, bir seçim girdisinde seçimi (enjekte edilen
 * uygulayıcıyla) geri yükler.
 *
 * Seçim adımları **5'lik kayan pencereyle** sınırlıdır (§9.6 e): altıncı seçim
 * adımı gelince EN ESKİ seçim adımı listeden düşer; düzenleme adımları bu sınıra
 * dâhil değildir (sınırsız). Seçim adımlarının ne zaman/nasıl eklendiği (erteleme,
 * flush — §9.6 f) {@link SecimGecmisIzleyici}'de; burası yalnız birleşik yapıyı,
 * sınırı ve navigasyonu yönetir.
 *
 * Çekirdektedir, Electron'dan habersizdir (İlke 1).
 */
export class KomutGecmisi {
  readonly #girdiler: Girdi[] = [];
  /** Uygulanmış girdi sayısı (0..#girdiler.length). [0,#konum) uygulanmış, gerisi ileri. */
  #konum = 0;
  readonly #dinleyiciler = new Set<() => void>();
  /** Seçim girdisini geri yükleyen uygulayıcı (wiring enjekte eder; §9.6). */
  #secimUygula?: (kimlikler: readonly string[]) => void;

  /**
   * Seçim girdilerinin seçimi nasıl geri yükleyeceğini belirler (kimlik listesi →
   * SecimDeposu). Wiring (sekme başına) {@link SecimGecmisIzleyici} üzerinden verir;
   * bastırma + yeniden hizalama orada yapılır.
   */
  secimUygulayiciAyarla(fn: (kimlikler: readonly string[]) => void): void {
    this.#secimUygula = fn;
  }

  /** Komutu uygular, geçmişe (düzenleme girdisi olarak) ekler, ileri dalı temizler. */
  calistir(komut: Komut): void {
    komut.uygula();
    this.#girdiler.length = this.#konum; // ileri (redo) dalını at
    this.#girdiler.push({ tur: 'duzenleme', komut });
    this.#konum++;
    this.#bildir();
  }

  /**
   * Bir SEÇİM adımı ekler (§9.6 d/e). İleri dalı temizler, girdiyi ekler, 5'lik
   * pencereyi uygular. Seçimi BURADA uygulamaz — seçim zaten kullanıcı eyleminde
   * değişti; bu yalnız geçmişe yazılan anlık görüntüdür.
   */
  secimAdimiEkle(onceki: readonly string[], sonraki: readonly string[], etiket: string): void {
    this.#girdiler.length = this.#konum; // ileri (redo) dalını at
    this.#girdiler.push({ tur: 'secim', onceki: [...onceki], sonraki: [...sonraki], etiket });
    this.#konum++;
    this.#secimSinirla();
    this.#bildir();
  }

  /** Seçim adımlarını 5 ile sınırlar: fazlaysa EN ESKİ seçim adımını düşürür (§9.6 e). */
  #secimSinirla(): void {
    let say = 0;
    for (const g of this.#girdiler) if (g.tur === 'secim') say++;
    while (say > SECIM_PENCERESI) {
      const idx = this.#girdiler.findIndex((g) => g.tur === 'secim');
      if (idx === -1) break;
      this.#girdiler.splice(idx, 1);
      if (idx < this.#konum) this.#konum--; // düşen girdi uygulanmıştı → konum kayar
      say--;
    }
  }

  /** Geri alınabilir girdi var mı? */
  get geriAlinabilir(): boolean {
    return this.#konum > 0;
  }

  /** İleri alınabilir girdi var mı? */
  get ileriAlinabilir(): boolean {
    return this.#konum < this.#girdiler.length;
  }

  /** Son girdiyi geri alır (düzenleme → komut.geriAl; seçim → önceki seçimi yükle). */
  geriAl(): void {
    if (this.#konum === 0) return;
    const g = this.#girdiler[this.#konum - 1]!;
    this.#konum--;
    if (g.tur === 'duzenleme') g.komut.geriAl();
    else this.#secimUygula?.(g.onceki);
    this.#bildir();
  }

  /** Geri alınan son girdiyi yeniden uygular (düzenleme → uygula; seçim → sonraki seçim). */
  ileriAl(): void {
    if (this.#konum >= this.#girdiler.length) return;
    const g = this.#girdiler[this.#konum]!;
    this.#konum++;
    if (g.tur === 'duzenleme') g.komut.uygula();
    else this.#secimUygula?.(g.sonraki);
    this.#bildir();
  }

  /**
   * İleri (redo) dalını atar — geçmişin başka türlü değişmediği durumlarda yeni bir
   * kullanıcı eylemini "dallandırmak" için (§9.6 g). Seçim izleyicisi, ertelenen
   * tek-seçim gibi adım YAZMAYAN bir kullanıcı eyleminde de redo dalını temizlemek
   * için bunu çağırır (yoksa bayat redo, ctrl+y ile diriltilirdi). İleri dal yoksa
   * etkisizdir.
   */
  ileriDaliTemizle(): void {
    if (this.#konum >= this.#girdiler.length) return;
    this.#girdiler.length = this.#konum;
    this.#bildir();
  }

  /** Geçmişi sıfırlar (örn. yeni belge yüklenince). */
  temizle(): void {
    this.#girdiler.length = 0;
    this.#konum = 0;
    this.#bildir();
  }

  /**
   * Geçmiş zaman çizelgesinin anlık görüntüsü (Geçmiş paneli için, §11.3) —
   * düzenleme VE seçim adımları. Sıra eskiden yeniye; `uygulandi=false` olanlar
   * ileri (yeniden uygulanabilir) konumdadır. `tur` ile panel seçim adımlarını
   * düzenleme adımlarından görsel ayırabilir (§9.6 d).
   */
  girisler(): { etiket: string; uygulandi: boolean; tur: Girdi['tur'] }[] {
    return this.#girdiler.map((g, i) => ({
      etiket: g.tur === 'duzenleme' ? (g.komut.etiket ?? '') : g.etiket,
      uygulandi: i < this.#konum,
      tur: g.tur,
    }));
  }

  /** Şu an uygulanmış girdi sayısı (zaman çizelgesindeki konum). */
  get konum(): number {
    return this.#konum;
  }

  /** Toplam girdi (uygulanmış + ileri). */
  get toplam(): number {
    return this.#girdiler.length;
  }

  /** Zaman çizelgesinde tam `hedef` girdi uygulanmış olacak şekilde gider. */
  konumaGit(hedef: number): void {
    const sinirli = Math.max(0, Math.min(hedef, this.toplam));
    while (this.#konum > sinirli) this.geriAl();
    while (this.#konum < sinirli) this.ileriAl();
  }

  /** Geçmiş değişimine abone olur; iptal fonksiyonunu döndürür. */
  dinle(dinleyici: () => void): () => void {
    this.#dinleyiciler.add(dinleyici);
    return () => this.#dinleyiciler.delete(dinleyici);
  }

  #bildir(): void {
    for (const dinleyici of this.#dinleyiciler) dinleyici();
  }
}
