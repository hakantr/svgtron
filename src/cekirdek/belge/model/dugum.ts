/**
 * Soyut belge düğümü (AGENTS.md İlke 8).
 *
 * Belge modeli, canlı SVG DOM'u DEĞİLDİR; sürümden bağımsız, normalize bir
 * temsildir. `Dugum`, herhangi bir SVG elemanını jenerik ama yapısal olarak
 * tutar: normalize edilmiş etiket + öznitelik haritası + çocuklar (+ pür metin
 * içerik). Bu sayede içe aktarım her şeyi kaybetmeden alır (fidelity), dışa
 * aktarım profile göre yeniden üretir, ve çekirdek DOM'a/Electron'a bağlı kalmaz
 * (İlke 1).
 *
 * Üstüne, editörün aktif olarak düzenlediği kavramlar (şekil geometrisi, paint
 * server, filtre, animasyon, stil) tiplenmiş ERİŞİMCİLERLE okunur — ayrı
 * depolama değil, bu jenerik ağacın üzerinde katmanlar (özellik geldikçe büyür).
 */
export interface Dugum {
  /** Oturum içi kararlı, benzersiz kimlik (DOM eşlemesi ve seçim için). */
  readonly kimlik: string;
  /** Normalize edilmiş eleman adı (rect, g, filter, linearGradient...). */
  etiket: string;
  /** Öznitelikler: ad → değer (ekleme sırası korunur → dışa aktarım kararlı). */
  readonly oznitelikler: Map<string, string>;
  /** Eleman çocukları. */
  readonly cocuklar: Dugum[];
  /**
   * Pür metin içerik (yalnızca element çocuğu OLMAYAN düğümlerde: text/tspan-
   * yaprağı/title/desc/style). Karışık içerik (metin+eleman) bu MVP'de nadir
   * kabul edilir.
   */
  metin?: string;
  /**
   * Editör bayrağı (AGENTS.md §9.7): kilitli düğüm Tuval'den seçilemez/taşınamaz.
   * Modelin parçası ama SVG çıktısına ÖZNİTELİK olarak yazılmaz; kalıcılığı
   * İlke 10 yorumlarıyla sağlanır. Dışa aktarıcı bunu yok sayar.
   */
  kilitli?: boolean;
  /**
   * Editör bayrağı (TK-23): bu düğüm belgenin ARTBOARD'u (tam-boy zemin/sayfa).
   * Tuval sınırını çizer; artboard daima kilitlidir. Kalıcılığı İlke 10 yorumuyla
   * (`<!-- @svgtron artboard=true -->`). SVG çıktısına öznitelik olarak yazılmaz.
   */
  artboard?: boolean;
}

let sayac = 0;
/** Yeni benzersiz düğüm kimliği üretir. */
export function yeniKimlik(): string {
  return `d${++sayac}`;
}

/** Yeni bir düğüm oluşturur. */
export function dugumOlustur(
  etiket: string,
  oznitelikler?: Record<string, string> | Map<string, string>,
  cocuklar: Dugum[] = [],
  metin?: string,
): Dugum {
  const harita =
    oznitelikler instanceof Map
      ? new Map(oznitelikler)
      : new Map(Object.entries(oznitelikler ?? {}));
  return {
    kimlik: yeniKimlik(),
    etiket,
    oznitelikler: harita,
    cocuklar,
    metin,
  };
}

/** Düğümü ve tüm alt ağacını derinlik-öncelikli gezer. */
export function* gez(dugum: Dugum): Generator<Dugum> {
  yield dugum;
  for (const cocuk of dugum.cocuklar) yield* gez(cocuk);
}

/** Bir öznitelik değerini döndürür (yoksa null). */
export function oznitelik(dugum: Dugum, ad: string): string | null {
  return dugum.oznitelikler.get(ad) ?? null;
}

/** Alt ağaçtaki tüm `id` özniteliklerini toplar. */
export function tumIdler(kok: Dugum): Set<string> {
  const kume = new Set<string>();
  for (const d of gez(kok)) {
    const id = d.oznitelikler.get("id");
    if (id) kume.add(id);
  }
  return kume;
}

/** Alt ağaçtaki tüm sınıf adlarını (her `class` özniteliğinden) toplar. */
export function tumSiniflar(kok: Dugum): Set<string> {
  const kume = new Set<string>();
  for (const d of gez(kok)) {
    const sinif = d.oznitelikler.get("class");
    if (sinif) for (const ad of sinif.trim().split(/\s+/)) if (ad) kume.add(ad);
  }
  return kume;
}

/**
 * `onek` ile başlayan, belgede HENÜZ KULLANILMAYAN benzersiz bir id üretir.
 * Modül düzeyi sayaç yerine belgeyi tarar → yeniden açılan/çoklu belgede
 * `url(#id)` çakışması olmaz (SVG'de id benzersiz olmalı).
 */
export function benzersizId(kok: Dugum, onek: string): string {
  const mevcut = tumIdler(kok);
  let n = 1;
  let aday = `${onek}${n}`;
  while (mevcut.has(aday)) aday = `${onek}${++n}`;
  return aday;
}

/** `onek` ile başlayan, belgede henüz kullanılmayan benzersiz bir sınıf adı üretir. */
export function benzersizSinif(kok: Dugum, onek: string): string {
  const mevcut = tumSiniflar(kok);
  let n = 1;
  let aday = `${onek}${n}`;
  while (mevcut.has(aday)) aday = `${onek}${++n}`;
  return aday;
}
