/**
 * Cetvel yardımcıları (TK-37 #2) — saf. Tick aralığı ("güzel sayı") ve görünür
 * aralıktaki tick konumlarını hesaplar; çizim DOM tarafının işi.
 */

/**
 * Hedef piksel aralığına en yakın "güzel" kullanıcı-birimi adımı (1 / 2 / 5 × 10ⁿ).
 * @param pikselHedef İki tick arası istenen ekran px (örn. 80).
 * @param olcek Kullanıcı→ekran ölçeği (CTM.a). 0/negatifse 1 kabul edilir.
 */
export function guzelAdim(pikselHedef: number, olcek: number): number {
  const o = olcek > 0 ? olcek : 1;
  const hamKullanici = pikselHedef / o; // hedef px'in kullanıcı-birimi karşılığı
  const us = Math.pow(10, Math.floor(Math.log10(Math.max(hamKullanici, 1e-9))));
  const oran = hamKullanici / us; // 1..10
  const carpan = oran >= 5 ? 5 : oran >= 2 ? 2 : 1;
  return carpan * us;
}

/**
 * [enKucuk, enBuyuk] kullanıcı aralığında, `adim`'ın katı olan tick değerleri.
 * (Aşırı üretimi önlemek için en çok `kapasite` tane döndürür.)
 */
export function tickler(
  enKucuk: number,
  enBuyuk: number,
  adim: number,
  kapasite = 1000,
): number[] {
  if (!(adim > 0) || !(enBuyuk > enKucuk)) return [];
  const ilk = Math.ceil(enKucuk / adim) * adim;
  const out: number[] = [];
  for (let v = ilk; v <= enBuyuk && out.length < kapasite; v += adim) {
    // Kayan nokta gürültüsünü temizle (örn. 0.1+0.2).
    out.push(Math.abs(v) < adim / 1e6 ? 0 : v);
  }
  return out;
}
