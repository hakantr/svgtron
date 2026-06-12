import { BelgeDeposu } from '../../cekirdek/belge/belge-deposu';
import { SecimDeposu } from '../../cekirdek/secim/secim-deposu';
import { KomutGecmisi } from '../../cekirdek/komutlar/komut-gecmisi';
import { SecimGecmisIzleyici } from '../../cekirdek/secim/secim-gecmis-izleyici';
import { BelgeDeposuVekil, SecimDeposuVekil, KomutGecmisiVekil } from './sekme-vekiller';

/**
 * Bir sekme (çalışma alanı/belge oturumu) — kendi belge/seçim/geçmiş store'ları.
 * Görünüm durumudur (İlke 9): undo'ya girmez, belge modeline dokunmaz.
 */
export interface Sekme {
  readonly belge: BelgeDeposu;
  readonly secim: SecimDeposu;
  readonly gecmis: KomutGecmisi;
  /** Seçim geçmişi izleyicisi (§9.6) — seçimi birleşik geçmişe bağlar. */
  readonly secimGecmisi: SecimGecmisIzleyici;
}

/**
 * Sekme yöneticisi (çoklu belge, kullanıcı isteği) — sekmeleri tutar, aktif olanı
 * izler ve panellerin gördüğü VEKİL store'ları aktif sekmeye yönlendirir.
 *
 * Paneller {@link belge}/{@link secim}/{@link gecmis} vekillerine bir kez abone olur
 * (kabuk/registry değişmez, İlke 5); sekme değişince vekiller yeni sekmenin gerçek
 * store'larına bağlanıp panelleri uyarır. `oynatma` sekme başına DEĞİLDİR: tek tuval
 * aktif belgeyi render ettiğinden Playback aktif tuvali kendiliğinden izler.
 */
class SekmeYoneticisi {
  readonly #sekmeler: Sekme[] = [];
  #aktifIndis = 0;
  /** Panellerin gördüğü vekiller (aktif sekmeye delege eder). */
  readonly belge = new BelgeDeposuVekil();
  readonly secim = new SecimDeposuVekil();
  readonly gecmis = new KomutGecmisiVekil();
  /** Sekme listesi / aktif sekme değişimi dinleyicileri (sekme çubuğu + kabuk). */
  readonly #dinleyiciler = new Set<() => void>();

  constructor() {
    this.#sekmeler.push(this.#yeniSekmeNesnesi());
    this.#vekilleriBagla();
  }

  #yeniSekmeNesnesi(): Sekme {
    const belge = new BelgeDeposu();
    const secim = new SecimDeposu();
    const gecmis = new KomutGecmisi();
    // Seçim geçmişi (§9.6): kimlik → düğüm çözümü aktif belgeden (silinmişse undefined).
    const secimGecmisi = new SecimGecmisIzleyici(secim, gecmis, (k) => belge.belge?.dugumBul(k));
    return { belge, secim, gecmis, secimGecmisi };
  }

  #vekilleriBagla(): void {
    const s = this.#sekmeler[this.#aktifIndis]!;
    this.belge.aktifAyarla(s.belge);
    this.secim.aktifAyarla(s.secim);
    this.gecmis.aktifAyarla(s.gecmis);
  }

  /** Sekmeler (sıralı). */
  get sekmeler(): readonly Sekme[] {
    return this.#sekmeler;
  }
  /** Aktif sekme indisi. */
  get aktifIndis(): number {
    return this.#aktifIndis;
  }
  /** Aktif sekme. */
  get aktif(): Sekme {
    return this.#sekmeler[this.#aktifIndis]!;
  }

  /** Aktif sekmeyi değiştirir (vekiller yeni sekmeye yönlenir, paneller tepki verir). */
  aktifSec(indis: number): void {
    if (indis < 0 || indis >= this.#sekmeler.length || indis === this.#aktifIndis) return;
    this.#aktifIndis = indis;
    this.#vekilleriBagla();
    this.#bildir();
  }

  /** Yeni boş sekme açıp aktif yapar. */
  yeniSekme(): Sekme {
    const s = this.#yeniSekmeNesnesi();
    this.#sekmeler.push(s);
    this.#aktifIndis = this.#sekmeler.length - 1;
    this.#vekilleriBagla();
    this.#bildir();
    return s;
  }

  /** Bir sekmeyi kapatır; son sekme kapanırsa yerine boş bir sekme bırakılır. */
  sekmeKapat(indis: number): void {
    if (indis < 0 || indis >= this.#sekmeler.length) return;
    this.#sekmeler[indis]!.secimGecmisi.birak(); // aboneliği bırak (sızıntı önle)
    this.#sekmeler.splice(indis, 1);
    if (this.#sekmeler.length === 0) this.#sekmeler.push(this.#yeniSekmeNesnesi());
    if (this.#aktifIndis > indis) this.#aktifIndis--;
    if (this.#aktifIndis >= this.#sekmeler.length) this.#aktifIndis = this.#sekmeler.length - 1;
    this.#vekilleriBagla();
    this.#bildir();
  }

  /** Sekme listesi / aktif değişimine abone olur. */
  dinle(d: () => void): () => void {
    this.#dinleyiciler.add(d);
    return () => this.#dinleyiciler.delete(d);
  }
  #bildir(): void {
    for (const d of this.#dinleyiciler) d();
  }
}

/** Uygulama geneli sekme yöneticisi. */
export const sekmeYoneticisi = new SekmeYoneticisi();
