/**
 * Çizim erişimi — seçili düğümün RENDER EDİLMİŞ DOM elemanına erişim köprüsü.
 *
 * Belge modeli tek doğruluk kaynağıdır (İlke 3); ama bir nesnenin EKRANDA
 * görünen efektif değerini (CSS sınıfından/gradient'ten gelen dolgu rengi gibi)
 * okumak için canlı DOM elemanı + `getComputedStyle` gerekir. Tuval, render
 * edilen elemanlara erişimi buraya yayınlar; denetçi alan setleri bunu okur.
 *
 * Yalnızca renderer/UI tarafıdır; çekirdek bundan habersizdir (İlke 1).
 */
let getir: ((kimlik: string) => Element | null) | null = null;

export const cizimErisimi = {
  /** Tuval, kimlik→eleman erişimcisini buraya verir (null = temizle). */
  kaynakAyarla(fn: ((kimlik: string) => Element | null) | null): void {
    getir = fn;
  },
  /** Kimliğe karşılık gelen render edilmiş DOM elemanı (yoksa null). */
  eleman(kimlik: string): Element | null {
    return getir?.(kimlik) ?? null;
  },
};
