import type { Belge } from '../belge';
import { gez, type Dugum } from '../model/dugum';
import type { Komut } from '../../komutlar/komut';
import { OznitelikDegistirKomutu } from '../../komutlar/oznitelik-degistir-komutu';
import { MetinKomutu } from '../../komutlar/metin-komutu';
import { BilesikKomut } from '../../komutlar/dugum-komutlari';

/**
 * Güvenli yeniden adlandırma (CLAUDE.md §8.2, İlke 7).
 *
 * Bir kaynağın id'sini (ya da stil sınıf adını) değiştirir VE ona atıf veren TÜM
 * şekillerdeki referansları (`url(#eski)`, `#eski`, `class="eski"`) **aynı anda**
 * günceller — hepsi tek BilesikKomut (tek geri-al adımı, dangling bırakmaz). Atıf
 * verenler referans indeksiyle O(1) bulunur. Saf çekirdek (İlke 1).
 */

function kacis(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Bir düğümdeki `url(#eski)` / `#eski` atıflarını `yeni`'ye çeviren komutlar. */
function idReferansiniYenidenAdlandir(belge: Belge, dugum: Dugum, eski: string, yeni: string): Komut[] {
  const esc = kacis(eski);
  const urlTest = new RegExp(`url\\(\\s*["']?#${esc}["']?\\s*\\)`, 'i');
  // url(#eski) içindeki id'yi koru-değiştir (tırnak/boşluk korunur).
  const urlGlobal = new RegExp(`(url\\(\\s*["']?#)${esc}(["']?\\s*\\))`, 'gi');
  const hashEsit = new RegExp(`^\\s*#${esc}\\s*$`, 'i');

  const komutlar: Komut[] = [];
  for (const [ad, deger] of dugum.oznitelikler) {
    if (ad === 'style') {
      if (urlTest.test(deger)) {
        komutlar.push(new OznitelikDegistirKomutu(belge, dugum, 'style', deger.replace(urlGlobal, `$1${yeni}$2`)));
      }
    } else if ((ad === 'href' || ad === 'xlink:href') && hashEsit.test(deger)) {
      komutlar.push(new OznitelikDegistirKomutu(belge, dugum, ad, `#${yeni}`));
    } else if (urlTest.test(deger)) {
      // href/xlink:href url(#..) ya da doğrudan url-öznitelik (fill/filter/...).
      komutlar.push(new OznitelikDegistirKomutu(belge, dugum, ad, deger.replace(urlGlobal, `$1${yeni}$2`)));
    }
  }
  return komutlar;
}

/** Bir düğümün `class` listesinde `eski` sınıfını `yeni` ile değiştiren komut. */
function sinifReferansiniYenidenAdlandir(belge: Belge, dugum: Dugum, eski: string, yeni: string): Komut[] {
  const mevcut = (dugum.oznitelikler.get('class') ?? '').split(/\s+/).filter(Boolean);
  if (!mevcut.includes(eski)) return [];
  // eski→yeni; `yeni` zaten varsa yinelenmesin (dedup).
  const goruldu = new Set<string>();
  const yeniListe = mevcut
    .map((c) => (c === eski ? yeni : c))
    .filter((c) => (goruldu.has(c) ? false : (goruldu.add(c), true)));
  return [new OznitelikDegistirKomutu(belge, dugum, 'class', yeniListe.join(' '))];
}

/** url-kaynağın TANIM düğümünün `id`'sini yeniden adlandıran komut (yoksa null). */
function tanimIdKomutu(belge: Belge, eski: string, yeni: string): Komut | null {
  for (const d of gez(belge.kok)) {
    if (d.oznitelikler.get('id') === eski) return new OznitelikDegistirKomutu(belge, d, 'id', yeni);
  }
  return null;
}

/** class-kaynağın `<style>` kurallarındaki seçiciyi (`.eski` → `.yeni`) değiştiren komutlar. */
function sinifTanimKomutlari(belge: Belge, eski: string, yeni: string): Komut[] {
  const esc = kacis(eski);
  const komutlar: Komut[] = [];
  for (const d of gez(belge.kok)) {
    if (d.etiket !== 'style') continue;
    const metin = d.metin ?? '';
    // `.eski` seçicisi (sonrası harf/-/_ olmayan → `.eskiUzun` yanlış eşleşmesin).
    const sel = new RegExp(`\\.${esc}(?![\\w-])`, 'g');
    if (sel.test(metin)) {
      komutlar.push(new MetinKomutu(belge, d, metin.replace(new RegExp(`\\.${esc}(?![\\w-])`, 'g'), `.${yeni}`)));
    }
  }
  return komutlar;
}

/** Belgede bir SVG `id` zaten kullanımda mı? */
function idKullanimda(belge: Belge, id: string): boolean {
  for (const d of gez(belge.kok)) if (d.oznitelikler.get('id') === id) return true;
  return false;
}

/** Bir sınıf adı `<style>` kurallarında zaten tanımlı mı? */
function sinifTanimli(belge: Belge, sinif: string): boolean {
  const sel = new RegExp(`\\.${kacis(sinif)}(?![\\w-])`);
  for (const d of gez(belge.kok)) {
    if (d.etiket === 'style' && sel.test(d.metin ?? '')) return true;
  }
  return false;
}

/** Geçerli bir SVG id/sınıf adı mı (boşluksuz, NCName benzeri)? */
function gecerliAd(ad: string): boolean {
  return /^[A-Za-z_][\w-]*$/.test(ad);
}

/** Yeniden adlandırma sonucu. `hata` doluysa işlem yapılmamalı. */
export interface YenidenAdlandirSonuc {
  readonly komut: Komut | null;
  readonly sayi: number;
  readonly hata?: 'gecersiz' | 'cakisma';
}

/**
 * Bir kaynağı (id ya da sınıf) güvenle yeniden adlandıran tek BilesikKomut'u üretir
 * + güncellenen atıf-veren şekil sayısı. `sinifMi` true ise stil sınıfı, değilse
 * `url(#id)` kaynağı. Geçersiz/çakışan adda `hata` döner (komut null).
 */
export function kaynakYenidenAdlandir(
  belge: Belge,
  eskiId: string,
  yeniHam: string,
  sinifMi: boolean,
): YenidenAdlandirSonuc {
  const yeni = yeniHam.trim();
  if (yeni === eskiId) return { komut: null, sayi: 0 }; // değişiklik yok
  if (!gecerliAd(yeni)) return { komut: null, sayi: 0, hata: 'gecersiz' };
  if (sinifMi ? sinifTanimli(belge, yeni) : idKullanimda(belge, yeni)) {
    return { komut: null, sayi: 0, hata: 'cakisma' };
  }

  const idx = belge.referansIndeksi;
  const kullananlar = sinifMi ? idx.sinifiKullananlar(eskiId) : idx.kullananlar(eskiId);

  const tanimKomutlari = sinifMi
    ? sinifTanimKomutlari(belge, eskiId, yeni)
    : [tanimIdKomutu(belge, eskiId, yeni)].filter((k): k is Komut => k !== null);

  const referansKomutlari: Komut[] = [];
  for (const d of kullananlar) {
    referansKomutlari.push(
      ...(sinifMi
        ? sinifReferansiniYenidenAdlandir(belge, d, eskiId, yeni)
        : idReferansiniYenidenAdlandir(belge, d, eskiId, yeni)),
    );
  }

  const hepsi = [...tanimKomutlari, ...referansKomutlari];
  if (hepsi.length === 0) return { komut: null, sayi: 0 };

  return {
    komut: hepsi.length === 1 ? hepsi[0]! : new BilesikKomut('yeniden adlandır', hepsi),
    sayi: kullananlar.length,
  };
}
