import type { Belge } from "../belge/belge";
import type { Dugum } from "../belge/model/dugum";
import type { Komut } from "./komut";

/**
 * Düğüm yapısı komutları (İlke 2) — ekleme/çıkarma/bileşik. Gradyan/filtre gibi
 * tanım üretimi ve ileride şekil çizim araçları bunları kullanır.
 */

/** Bir düğümü bir ebeveynin çocuklarına ekler. */
export class DugumEkleKomutu implements Komut {
  readonly etiket = "düğüm ekle";
  constructor(
    private readonly belge: Belge,
    private readonly ebeveyn: Dugum,
    private readonly dugum: Dugum,
    private readonly indeks?: number,
  ) {}

  uygula(): void {
    const i = this.indeks ?? this.ebeveyn.cocuklar.length;
    this.ebeveyn.cocuklar.splice(i, 0, this.dugum);
    this.belge.indeksEkle(this.dugum);
    this.belge.bildir();
  }

  geriAl(): void {
    const i = this.ebeveyn.cocuklar.indexOf(this.dugum);
    if (i !== -1) this.ebeveyn.cocuklar.splice(i, 1);
    this.belge.indeksCikar(this.dugum);
    this.belge.bildir();
  }
}

/** Bir düğümü ebeveyninden çıkarır (yerini geri-al için saklar). */
export class DugumCikarKomutu implements Komut {
  readonly etiket = "düğüm sil";
  #indeks = -1;
  constructor(
    private readonly belge: Belge,
    private readonly ebeveyn: Dugum,
    private readonly dugum: Dugum,
  ) {}

  uygula(): void {
    this.#indeks = this.ebeveyn.cocuklar.indexOf(this.dugum);
    if (this.#indeks !== -1) this.ebeveyn.cocuklar.splice(this.#indeks, 1);
    this.belge.indeksCikar(this.dugum);
    this.belge.bildir();
  }

  geriAl(): void {
    if (this.#indeks !== -1) {
      this.ebeveyn.cocuklar.splice(this.#indeks, 0, this.dugum);
      this.belge.indeksEkle(this.dugum);
      this.belge.bildir();
    }
  }
}

/**
 * Bir düğümü ebeveyni içinde AYNI konumda başka bir düğümle değiştirir (İlke 2).
 * Konum çalışma anında `indexOf` ile bulunur → aynı BilesikKomut içindeki başka
 * ekleme/çıkarmaların index'i kaydırmasından etkilenmez. Örn. dejenere `path`'i
 * eşdeğer `line` ile değiştirme (geometri sadeleştirme).
 */
export class DugumDegistirKomutu implements Komut {
  readonly etiket = "düğüm değiştir";
  constructor(
    private readonly belge: Belge,
    private readonly ebeveyn: Dugum,
    private readonly eski: Dugum,
    private readonly yeni: Dugum,
  ) {}

  uygula(): void {
    this.#degistir(this.eski, this.yeni);
  }

  geriAl(): void {
    this.#degistir(this.yeni, this.eski);
  }

  #degistir(cikan: Dugum, giren: Dugum): void {
    const i = this.ebeveyn.cocuklar.indexOf(cikan);
    if (i === -1) return;
    this.ebeveyn.cocuklar.splice(i, 1, giren);
    this.belge.indeksCikar(cikan);
    this.belge.indeksEkle(giren);
    this.belge.bildir();
  }
}

/** Bir düğümü ebeveyni içinde yeni bir konuma taşır (z-sıralama, §9.4). */
export class SiraKomutu implements Komut {
  readonly etiket = "sırala";
  #eskiIndeks = -1;

  constructor(
    private readonly belge: Belge,
    private readonly ebeveyn: Dugum,
    private readonly dugum: Dugum,
    private readonly yeniIndeks: number,
  ) {}

  uygula(): void {
    const c = this.ebeveyn.cocuklar;
    this.#eskiIndeks = c.indexOf(this.dugum);
    if (this.#eskiIndeks === -1) return;
    c.splice(this.#eskiIndeks, 1);
    c.splice(Math.max(0, Math.min(this.yeniIndeks, c.length)), 0, this.dugum);
    this.belge.bildir();
  }

  geriAl(): void {
    const c = this.ebeveyn.cocuklar;
    const i = c.indexOf(this.dugum);
    if (i === -1 || this.#eskiIndeks === -1) return;
    c.splice(i, 1);
    c.splice(this.#eskiIndeks, 0, this.dugum);
    this.belge.bildir();
  }
}

/**
 * Bir şekli (line/polyline/polygon) YERİNDE `path`'e çevirir — kimlik KORUNUR
 * (seçim/referans bayatlamaz; Yansıtıcı etiket değişince elemanı yeniden kurar).
 * Düğüm aracında Ctrl+sürükle kavis için: şekle özgü geometri öznitelikleri
 * (points / x1,y1,x2,y2) kaldırılır, yerine kavisli `d` yazılır (İlke 2).
 */
export class SekliPathaCevirKomutu implements Komut {
  readonly etiket = "path'e çevir";
  static readonly #SEKIL_OZN = ["points", "x1", "y1", "x2", "y2"];
  readonly #eskiEtiket: string;
  readonly #eskiOzn: [string, string][];

  constructor(
    private readonly belge: Belge,
    private readonly dugum: Dugum,
    private readonly yeniD: string,
  ) {
    this.#eskiEtiket = dugum.etiket;
    this.#eskiOzn = [...dugum.oznitelikler]; // tam anlık görüntü (sıra dahil)
  }

  uygula(): void {
    this.dugum.etiket = "path";
    const o = this.dugum.oznitelikler;
    for (const ad of SekliPathaCevirKomutu.#SEKIL_OZN) o.delete(ad);
    o.set("d", this.yeniD);
    this.belge.bildir();
  }

  geriAl(): void {
    this.dugum.etiket = this.#eskiEtiket;
    const o = this.dugum.oznitelikler;
    o.clear();
    for (const [ad, deger] of this.#eskiOzn) o.set(ad, deger);
    this.belge.bildir();
  }
}

/** Birden çok komutu tek bir geri-al adımı olarak gruplar. */
export class BilesikKomut implements Komut {
  constructor(
    readonly etiket: string,
    private readonly komutlar: readonly Komut[],
  ) {}

  uygula(): void {
    for (const k of this.komutlar) k.uygula();
  }

  geriAl(): void {
    for (let i = this.komutlar.length - 1; i >= 0; i--)
      this.komutlar[i]!.geriAl();
  }
}
