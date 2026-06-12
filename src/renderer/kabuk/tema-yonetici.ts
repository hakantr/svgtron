import { temaKayitDefteri } from '../../cekirdek/registry/tema-registry';
import { VARSAYILAN_TEMA_ID } from '../ozellikler/temalar/temalar';

/**
 * Tema yöneticisi (renderer/kabuk).
 *
 * Seçili temanın token'larını belge köküne (`<html>`) yazar — böylece değerler
 * Shadow DOM'ları delip tüm bileşenlere ulaşır. Seçimi `localStorage`'da
 * saklar. Tema verisi çekirdekteki registry'den gelir; burası yalnızca DOM'a
 * uygulama ve kalıcılık işini yapar.
 */
const DEPOLAMA_ANAHTARI = 'svgtron.tema';

class TemaYonetici {
  #mevcutId = VARSAYILAN_TEMA_ID;
  readonly #dinleyiciler = new Set<(id: string) => void>();

  /** O an etkin tema kimliği. */
  get mevcutId(): string {
    return this.#mevcutId;
  }

  /** Kayıtlı seçimi (yoksa varsayılanı) uygular. Başlangıçta bir kez çağrılır. */
  baslat(): void {
    const kayitli = this.#oku();
    this.uygula(kayitli && temaKayitDefteri.bul(kayitli) ? kayitli : VARSAYILAN_TEMA_ID);
  }

  /** Verilen temayı uygular ve seçimi saklar. Bilinmeyen id varsayılana düşer. */
  uygula(id: string): void {
    const tema = temaKayitDefteri.bul(id) ?? temaKayitDefteri.bul(VARSAYILAN_TEMA_ID);
    if (!tema) return; // hiç tema kayıtlı değilse sessizce çık

    const kok = document.documentElement;
    for (const [anahtar, deger] of Object.entries(tema.degiskenler)) {
      kok.style.setProperty(anahtar, deger);
    }
    // Tarayıcı bileşenleri (kaydırma çubuğu, form kontrolleri) için ipucu.
    kok.style.colorScheme = tema.tur === 'acik' ? 'light' : 'dark';

    this.#mevcutId = tema.id;
    this.#yaz(tema.id);
    for (const dinleyici of this.#dinleyiciler) dinleyici(tema.id);
  }

  /** Tema değişimine abone olur; iptal fonksiyonunu döndürür. */
  dinle(dinleyici: (id: string) => void): () => void {
    this.#dinleyiciler.add(dinleyici);
    return () => this.#dinleyiciler.delete(dinleyici);
  }

  // localStorage `file://` altında SecurityError atabilir; sessizce yut.
  #oku(): string | null {
    try {
      return localStorage.getItem(DEPOLAMA_ANAHTARI);
    } catch {
      return null;
    }
  }

  #yaz(id: string): void {
    try {
      localStorage.setItem(DEPOLAMA_ANAHTARI, id);
    } catch {
      /* kalıcılık yoksa sorun değil */
    }
  }
}

/** Uygulama genelinde tek tema yöneticisi. */
export const temaYonetici = new TemaYonetici();
