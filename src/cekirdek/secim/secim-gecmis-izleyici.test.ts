import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SecimDeposu } from './secim-deposu';
import { KomutGecmisi } from '../komutlar/komut-gecmisi';
import { SecimGecmisIzleyici } from './secim-gecmis-izleyici';
import { secimKaydiBastir } from './secim-kayit-bastir';
import type { Dugum } from '../belge/model/dugum';
import type { Komut } from '../komutlar/komut';

/**
 * §9.6 (d–g) seçim geçmişi birim testleri. Gerçek Belge/DOMParser kullanmadan,
 * sahte Dugum'lar ve bir kimlik→düğüm çözücüyle çalışır.
 */

/** Sahte düğüm (izleyicinin kullandığı alanlar: kimlik, oznitelikler, etiket). */
function dugum(ad: string): Dugum {
  return {
    kimlik: ad,
    etiket: 'rect',
    oznitelikler: new Map([['id', ad]]),
    cocuklar: [],
  } as unknown as Dugum;
}

/** Belge değiştirmeyen sahte düzenleme komutu (uygula/geriAl sayaçlı). */
function sahteKomut(etiket: string): Komut & { uygulandiSayisi: number; geriAlindiSayisi: number } {
  return {
    etiket,
    uygulandiSayisi: 0,
    geriAlindiSayisi: 0,
    uygula() {
      this.uygulandiSayisi++;
    },
    geriAl() {
      this.geriAlindiSayisi++;
    },
  };
}

/** Test ortamı kurar: depo + geçmiş + izleyici + düğüm haritası. */
function kur(adlar: string[]) {
  const secim = new SecimDeposu();
  const gecmis = new KomutGecmisi();
  const harita = new Map<string, Dugum>();
  for (const ad of adlar) harita.set(ad, dugum(ad));
  const izleyici = new SecimGecmisIzleyici(secim, gecmis, (k) => harita.get(k));
  const n = (ad: string) => harita.get(ad)!;
  return { secim, gecmis, izleyici, n };
}

/** girisler() etiketlerini dizi olarak verir. */
function etiketler(gecmis: KomutGecmisi): string[] {
  return gecmis.girisler().map((g) => g.etiket);
}

/** Seçili kimlik kümesini (sırasız) verir. */
function seciliKimlikler(secim: SecimDeposu): string[] {
  return secim.secililer.map((d) => d.kimlik);
}

test('§9.6 f — tek seçim ertelenir, çoklu seçimde flush edilir', () => {
  const { secim, gecmis, n } = kur(['a', 'c']);
  secim.sec(n('a')); // tek → ertelenir, adım YOK
  assert.equal(gecmis.toplam, 0, 'tek seçim adım yazmamalı');
  secim.ekle(n('c')); // çoklu → bekleyen(a) flush + c kaydı
  assert.deepEqual(etiketler(gecmis), ['a seçildi', 'c seçildi']);
  assert.equal(gecmis.konum, 2);
});

test('§9.6 f — tek seçimi başka tek seçimle değiştirmek adım yazmaz', () => {
  const { secim, gecmis, n } = kur(['a', 'b']);
  secim.sec(n('a'));
  secim.sec(n('b')); // tek → tek, yalnız bekleyen güncellenir
  assert.equal(gecmis.toplam, 0);
});

test('§9.6 f — bekleyen tek seçim boşa giderse adım yazılmaz', () => {
  const { secim, gecmis, n } = kur(['a']);
  secim.sec(n('a'));
  secim.temizle(); // bekleyen tek hiç işlenmemişti → atılır
  assert.equal(gecmis.toplam, 0);
});

test('§9.6 e — seçim adımları 5 ile sınırlı, düzenleme adımları korunur', () => {
  const { secim, gecmis, n } = kur(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
  gecmis.calistir(sahteKomut('düzenleme-1'));
  gecmis.calistir(sahteKomut('düzenleme-2'));
  // a..g tek tek shift-ekle (a tek→ertelenir, ilk çoklu b ile a flush olur)
  secim.sec(n('a'));
  for (const ad of ['b', 'c', 'd', 'e', 'f', 'g']) secim.ekle(n(ad));
  const giris = gecmis.girisler();
  const secimSayisi = giris.filter((g) => !g.etiket.startsWith('düzenleme')).length;
  assert.equal(secimSayisi, 5, 'en çok 5 seçim adımı tutulmalı');
  assert.equal(giris.filter((g) => g.etiket.startsWith('düzenleme')).length, 2, 'düzenleme adımları korunmalı');
  // İlk iki girdi düzenleme olmalı (en eski seçim adımları düştü).
  assert.equal(giris[0]!.etiket, 'düzenleme-1');
  assert.equal(giris[1]!.etiket, 'düzenleme-2');
});

test('§9.6 d–g — devir örneğinin tam izi', () => {
  const { secim, gecmis, n } = kur(['a', 'b', 'c', 'e', 'g', 'f', 'daire']);
  // 1,2: düzenleme adımları
  gecmis.calistir(sahteKomut('"a" yazıldı'));
  gecmis.calistir(sahteKomut('"b" silindi'));
  // 3–7: a,c,e,g,b (shift ile)
  secim.sec(n('a'));
  secim.ekle(n('c'));
  secim.ekle(n('e'));
  secim.ekle(n('g'));
  secim.ekle(n('b'));
  assert.deepEqual(etiketler(gecmis), [
    '"a" yazıldı',
    '"b" silindi',
    'a seçildi',
    'c seçildi',
    'e seçildi',
    'g seçildi',
    'b seçildi',
  ]);

  // f seçilince → en eski seçim adımı (a) düşer, düzenleme adımları kalır
  secim.ekle(n('f'));
  assert.deepEqual(etiketler(gecmis), [
    '"a" yazıldı',
    '"b" silindi',
    'c seçildi',
    'e seçildi',
    'g seçildi',
    'b seçildi',
    'f seçildi',
  ]);

  // daireye tıkla (seçili değil) → {a..f} bırakılır + daire bekleyen
  secim.sec(n('daire'));
  assert.deepEqual(seciliKimlikler(secim), ['daire']);
  // Son girdi bir bırakma adımı olmalı; en eski seçim adımı (c) düştü
  const sonEtiket = etiketler(gecmis).at(-1)!;
  assert.match(sonEtiket, /bırakıldı/);

  // shift+a → bekleyen daire flush + a
  secim.ekle(n('a'));
  assert.deepEqual(seciliKimlikler(secim), ['daire', 'a']);
  const et = etiketler(gecmis);
  assert.equal(et.at(-2), 'daire seçildi');
  assert.equal(et.at(-1), 'a seçildi');

  // boşluğa tıkla → {daire,a} bırakılır
  secim.temizle();
  assert.match(etiketler(gecmis).at(-1)!, /bırakıldı/);
  const konumOnce = gecmis.konum;

  // ctrl+z → {daire,a} yeniden seçilir (kural g)
  gecmis.geriAl();
  assert.deepEqual(
    [...seciliKimlikler(secim)].sort(),
    ['a', 'daire'],
    'geri-al son bırakılan seçimi geri getirmeli',
  );
  assert.equal(gecmis.konum, konumOnce - 1);
});

test('birleşik geçmiş — düzenleme adımı geri/ileri alınır', () => {
  const { secim, gecmis, n } = kur(['a', 'b']);
  const k = sahteKomut('taşı');
  gecmis.calistir(k);
  assert.equal(k.uygulandiSayisi, 1);
  // Bir çoklu seçim adımı ekle
  secim.sec(n('a'));
  secim.ekle(n('b'));
  assert.equal(gecmis.konum, 3); // edit + 2 seçim

  // geri al: önce seçim adımları, sonra düzenleme
  gecmis.geriAl(); // b seçimini geri al
  gecmis.geriAl(); // a seçimini geri al
  assert.equal(k.geriAlindiSayisi, 0, 'henüz düzenleme geri alınmamalı');
  gecmis.geriAl(); // düzenleme
  assert.equal(k.geriAlindiSayisi, 1);
  gecmis.ileriAl(); // düzenleme yeniden uygula
  assert.equal(k.uygulandiSayisi, 2);
});

test('yeni adım gelince ileri (redo) dalı atılır', () => {
  const { secim, gecmis, n } = kur(['a', 'b', 'c']);
  secim.sec(n('a'));
  secim.ekle(n('b')); // {a,b} → 2 seçim adımı
  gecmis.geriAl(); // b seçimini geri al
  assert.equal(gecmis.ileriAlinabilir, true);
  // Yeni bir çoklu seçim → redo dalı atılmalı
  secim.sec(n('c'));
  secim.ekle(n('a'));
  assert.equal(gecmis.ileriAlinabilir, false, 'yeni adım sonrası redo dalı kalmamalı');
});

test('Bug A — düzenleme yan etkisi seçim, ayrı geçmiş adımı YAZMAZ (bastırma)', () => {
  const { secim, gecmis, n } = kur(['a', 'b']);
  secim.sec(n('a'));
  secim.ekle(n('b')); // {a,b}: 2 seçim adımı
  // "Sil" benzeri düzenleme: komut + seçimi boşalt, bastırma kapsamında.
  secimKaydiBastir(() => {
    gecmis.calistir(sahteKomut('sil'));
    secim.temizle();
  });
  // Geçmiş: ['a seçildi','b seçildi','sil'] — fazladan 'bırakıldı' YOK.
  assert.deepEqual(etiketler(gecmis), ['a seçildi', 'b seçildi', 'sil']);
  // Tek ctrl+z silmeyi geri alır (seçim adımı araya girmez).
  const k = gecmis.girisler();
  assert.equal(k.at(-1)!.tur, 'duzenleme');
});

test('Bug B — undo sonrası yeni TEK seçim, bayat redo dalını atar (§9.6 g)', () => {
  const { secim, gecmis, n } = kur(['a', 'b', 'c']);
  secim.sec(n('a'));
  secim.ekle(n('b')); // {a,b}
  gecmis.geriAl(); // → {a}, redo dalında 'b seçildi'
  assert.equal(gecmis.ileriAlinabilir, true);
  secim.sec(n('c')); // YENİ tek seçim (ertelenir ama yine de yeni eylem)
  assert.equal(gecmis.ileriAlinabilir, false, 'yeni tek seçim redo dalını atmalı');
});

test('Bug C — flush edilmiş tek-eleman adımına dönüp uzatmak YİNELENEN adım üretmez', () => {
  const { secim, gecmis, n } = kur(['daire', 'a', 'x']);
  secim.sec(n('daire'));
  secim.ekle(n('a')); // flush daire + a → ['daire seçildi','a seçildi']
  gecmis.geriAl(); // → {daire}
  gecmis.geriAl(); // → {}
  gecmis.ileriAl(); // → {daire} (flush adımının sonraki'si, TEK eleman)
  secim.ekle(n('x')); // {daire,x}
  assert.deepEqual(etiketler(gecmis), ['daire seçildi', 'x seçildi'], 'yinelenen "daire seçildi" olmamalı');
});

test('geçmiş temizlenince izleyici durumu sıfırlanır (belge yükleme)', () => {
  const { secim, gecmis, n } = kur(['a', 'b']);
  secim.sec(n('a'));
  secim.ekle(n('b'));
  assert.ok(gecmis.toplam > 0);
  // Belge yükleme benzeri: seçim temizle + geçmiş temizle
  secim.temizle();
  gecmis.temizle();
  assert.equal(gecmis.toplam, 0);
  // Sıfırlama sonrası ilk çoklu seçim taban=[]'ten temiz başlamalı
  secim.sec(n('a'));
  secim.ekle(n('b'));
  assert.deepEqual(etiketler(gecmis), ['a seçildi', 'b seçildi']);
});
