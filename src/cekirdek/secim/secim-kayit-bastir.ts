/**
 * Seçim-kaydı bastırma kapsamı (§9.6 d/f, §9.4 — İlke 9).
 *
 * Bir DÜZENLEMENİN yan etkisi olarak değişen seçim (örn. "sil" sonrası seçimi
 * boşalt, "çoğalt" sonrası kopyaları seç) seçim geçmişine AYRI bir adım YAZMAMALI:
 * bir kullanıcı eylemi = tek geri-al adımı (§9.4). Düzenleme akışları seçim
 * değişikliğini {@link secimKaydiBastir} kapsamında yapar; {@link SecimGecmisIzleyici}
 * bu sırada kayıt yapmaz, yalnız taban/bekleyen'i yeni seçime hizalar.
 *
 * Modül düzeyinde sayaç (yeniden-girişe dayanıklı). Aktif sekme dışındaki sekmelerin
 * seçimi bu sırada değişmediğinden tek bayrak güvenlidir. Saf çekirdek (İlke 1).
 */
let derinlik = 0;

/** `fn`'i seçim-kaydı bastırılmış olarak çalıştırır (iç içe güvenli). */
export function secimKaydiBastir<T>(fn: () => T): T {
  derinlik++;
  try {
    return fn();
  } finally {
    derinlik--;
  }
}

/** Şu an seçim-kaydı bastırılmış mı? */
export function secimKaydiBastirildiMi(): boolean {
  return derinlik > 0;
}
