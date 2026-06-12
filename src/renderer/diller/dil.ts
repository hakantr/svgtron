/// <reference types="vite/client" />

/**
 * Dil (i18n) yöneticisi — hafif, kanıtlanmış katalog deseni.
 *
 * Diller `*.dil` dosyalarında `anahtar = değer` satırlarıyla tutulur (Java
 * `.properties` / Minecraft `.lang` tarzı). Vite, derleme anında tüm `.dil`
 * dosyalarını ham metin olarak paketler; yeni dil eklemek = `diller/` altına
 * `en.dil`, `fr.dil`... koymak (kod değişmez).
 *
 * Varsayılan dil Türkçe'dir; bir anahtar seçili dilde yoksa Türkçe'ye, o da
 * yoksa anahtarın kendisine düşülür (eksik çeviri görünür kalır).
 *
 * `tr.dil` TEK DOĞRULUK KAYNAĞIDIR (CLAUDE.md §3, TK-24). Tr harici bir dil
 * seçilince (TK-28), o dilde EKSİK olan anahtarlar `<kod>.dil` kaynağına `= ?`
 * olarak eklenir (geliştirme; main `dil-servisi` üzerinden) → çevrilmemiş anahtar
 * dosyada görünür. Çevrilmemiş işareti olan `?` değeri, çalışma anında "yok"
 * sayılır (Türkçe'ye düşülür) — UI bozulmaz, marker yalnız dosya içindir.
 */
const VARSAYILAN_DIL = 'tr';
const DEPOLAMA_ANAHTARI = 'svgtron.dil';
/** Çevrilmemiş anahtar işareti (dosyada gözükür; çalışma anında "yok" sayılır). */
const CEVRILMEDI = '?';

// Tüm .dil dosyalarını ham metin olarak içe al (derleme anında).
const hamDosyalar = import.meta.glob('./*.dil', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** Bir `.dil` metnini anahtar→değer haritasına ayrıştırır. */
function ayristir(metin: string): Map<string, string> {
  const harita = new Map<string, string>();
  for (const ham of metin.split(/\r?\n/)) {
    const satir = ham.trim();
    if (!satir || satir.startsWith('#')) continue;
    const esit = satir.indexOf('=');
    if (esit === -1) continue;
    const anahtar = satir.slice(0, esit).trim();
    if (anahtar) harita.set(anahtar, satir.slice(esit + 1).trim());
  }
  return harita;
}

// Katalog: dilKodu → (anahtar → değer)
const katalog = new Map<string, Map<string, string>>();
for (const [yol, icerik] of Object.entries(hamDosyalar)) {
  const kod = yol.replace(/^.*\//, '').replace(/\.dil$/, '');
  katalog.set(kod, ayristir(icerik));
}

class DilYonetici {
  #kod = VARSAYILAN_DIL;
  readonly #dinleyiciler = new Set<() => void>();
  /** Bu oturumda kaynağı senkronlanan diller (tekrar IPC çağrısı yapma). */
  readonly #senkronlananlar = new Set<string>();

  /** Kayıtlı seçimi ya da sistem dilini uygular (yoksa varsayılan). */
  baslat(): void {
    const kayitli = this.#oku();
    const sistem = navigator.language?.slice(0, 2);
    this.#kod =
      kayitli && katalog.has(kayitli)
        ? kayitli
        : sistem && katalog.has(sistem)
          ? sistem
          : VARSAYILAN_DIL;
    document.documentElement.lang = this.#kod;
    this.#kaynagiSenkronla(this.#kod); // başlangıç dili tr değilse eksikleri işaretle
  }

  /**
   * Tr harici bir dilin kaynağını (`<kod>.dil`), tr.dil'de olup o dilde OLMAYAN
   * anahtarlarla senkronlar (TK-28): main eksikleri `= ?` olarak dosyaya ekler.
   * Oturumda dil başına bir kez; yalnız geliştirmede etki eder (üretimde no-op).
   */
  #kaynagiSenkronla(kod: string): void {
    if (kod === VARSAYILAN_DIL || this.#senkronlananlar.has(kod)) return;
    this.#senkronlananlar.add(kod);
    const trAnahtarlar = katalog.get(VARSAYILAN_DIL);
    const dilAnahtarlar = katalog.get(kod);
    if (!trAnahtarlar) return;
    const eksik = [...trAnahtarlar.keys()].filter((a) => !dilAnahtarlar?.has(a));
    if (eksik.length === 0) return;
    try {
      void window.api?.dilDosyasiSenkron?.(kod, eksik);
    } catch {
      /* bakım aracı; başarısızlık akışı bozmaz */
    }
  }

  /** O an etkin dil kodu. */
  get mevcut(): string {
    return this.#kod;
  }

  /** Mevcut diller (kod + insan-okur ad). */
  dilleriAl(): { kod: string; ad: string }[] {
    return [...katalog.entries()].map(([kod, harita]) => ({
      kod,
      ad: harita.get('dil.ad') ?? kod,
    }));
  }

  /** Dili değiştirir, saklar ve dinleyicileri uyarır. */
  ayarla(kod: string): void {
    if (!katalog.has(kod) || kod === this.#kod) return;
    this.#kod = kod;
    document.documentElement.lang = kod;
    this.#yaz(kod);
    this.#kaynagiSenkronla(kod); // tr harici seçimde eksikleri dosyada işaretle
    for (const dinleyici of this.#dinleyiciler) dinleyici();
  }

  /** Anahtarı çevirir; `{ad}` türü yer tutucuları değişkenlerle doldurur. */
  cevir(anahtar: string, degiskenler?: Record<string, string | number>): string {
    // Seçili dildeki değer; çevrilmemiş işareti (`?`) "yok" sayılır → Türkçe'ye düşülür.
    const secili = katalog.get(this.#kod)?.get(anahtar);
    const deger =
      (secili !== undefined && secili !== CEVRILMEDI ? secili : undefined) ??
      katalog.get(VARSAYILAN_DIL)?.get(anahtar) ??
      anahtar;
    if (!degiskenler) return deger;
    return deger.replace(/\{(\w+)\}/g, (_, ad: string) =>
      ad in degiskenler ? String(degiskenler[ad]) : `{${ad}}`,
    );
  }

  /** Dil değişimine abone olur; iptal fonksiyonunu döndürür. */
  dinle(dinleyici: () => void): () => void {
    this.#dinleyiciler.add(dinleyici);
    return () => this.#dinleyiciler.delete(dinleyici);
  }

  #oku(): string | null {
    try {
      return localStorage.getItem(DEPOLAMA_ANAHTARI);
    } catch {
      return null;
    }
  }

  #yaz(kod: string): void {
    try {
      localStorage.setItem(DEPOLAMA_ANAHTARI, kod);
    } catch {
      /* kalıcılık yoksa sorun değil */
    }
  }
}

/** Uygulama genelinde tek dil yöneticisi. */
export const dilYonetici = new DilYonetici();

/** Kısa yol: `t('menu.dosya.ac')`. */
export const t = (
  anahtar: string,
  degiskenler?: Record<string, string | number>,
): string => dilYonetici.cevir(anahtar, degiskenler);
