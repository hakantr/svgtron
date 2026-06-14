/**
 * localStorage okuma/yazma sarmalayıcıları. localStorage erişilemezse (gizli mod,
 * kota, devre dışı) sessizce null/no-op döner — her çağıran ayrı try/catch
 * yazıyordu; tek yerde toplandı. Ayrıştırma (sayı/bayrak/enum) çağırana ait kalır.
 */
export function yerelOku(anahtar: string): string | null {
  try {
    return localStorage.getItem(anahtar);
  } catch {
    return null;
  }
}

export function yerelYaz(anahtar: string, deger: string): void {
  try {
    localStorage.setItem(anahtar, deger);
  } catch {
    /* localStorage yoksa yalnız bellekte kalır */
  }
}
