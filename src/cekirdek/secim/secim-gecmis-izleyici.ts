import type { Dugum } from '../belge/model/dugum';
import type { SecimDeposu } from './secim-deposu';
import type { KomutGecmisi } from '../komutlar/komut-gecmisi';
import { secimKaydiBastirildiMi } from './secim-kayit-bastir';

/**
 * Seçim geçmişi izleyicisi (CLAUDE.md §9.6 d–g).
 *
 * `SecimDeposu`'nu izler ve seçim geçişlerini birleşik geçmişe (`KomutGecmisi`)
 * **seçim adımı** olarak yazar. Üç kuralı uygular:
 *
 *  - (f) **Erteleme.** Tek bir nesnenin seçilmesi geçmişe HEMEN yazılmaz; "bekleyen"
 *    olarak bekler. Bir tek-seçimi başka bir tek-seçimle değiştirmek de adım yazmaz.
 *    Tek seçim, ancak ÇOKLU seçime dönüşünce yazılır: bekleyen flush edilir, sonra
 *    yeni durum yazılır.
 *  - (e) **5'lik kayan pencere.** Sınırı `KomutGecmisi` uygular (en eski seçim adımı
 *    düşer); izleyici yalnız adımları üretir.
 *  - (g) **Geri dönüş.** Bir seçim bırakıldıktan sonra geri-al onu yeniden seçer —
 *    bu, geçmişteki seçim adımının `onceki` anlık görüntüsünden gelir.
 *
 * **Değişmezler (ileri yönde):** `taban` (geçmişe işlenmiş seçim) DAİMA ya boş ya
 * çoklu (≥2) bir kümedir — tekler hep `bekleyen`'de yaşar. Navigasyondan sonra
 * (geri/ileri al) durum {@link #yenidenHizala} ile canlı seçime göre yeniden kurulur
 * (o an tek bir seçimse `bekleyen`, değilse `taban`).
 *
 * Navigasyon sırasında izleyici **bastırılır** (geçmişin seçimi geri yüklemesi yeni
 * adım üretmesin). Çekirdektedir, Electron/Lit'ten habersizdir (İlke 1); etiketler
 * sabit Türkçe (Geçmiş panelindeki komut etiketleriyle tutarlı).
 */
export class SecimGecmisIzleyici {
  /** Geçmişe işlenmiş seçim (kimlikler). İleri yönde daima boş ya da çoklu (≥2). */
  #taban: string[] = [];
  /** Bekleyen (henüz işlenmemiş) TEK seçim; yoksa null. */
  #bekleyen: string[] | null = null;
  /** Navigasyon/sıfırlama sırasında kayıt yapma. */
  #bastirildi = false;
  /** Geçmiş "temizlendi mi" tespiti için son toplam. */
  #sonToplam = 0;
  #secimCoz?: () => void;
  #gecmisCoz?: () => void;

  constructor(
    private readonly secim: SecimDeposu,
    private readonly gecmis: KomutGecmisi,
    /** kimlik → o anki düğüm (geri yükleme + etiket adı için; silinmişse undefined). */
    private readonly cozumle: (kimlik: string) => Dugum | undefined,
  ) {
    this.#secimCoz = secim.dinle(() => this.#secimDegisti());
    this.#gecmisCoz = gecmis.dinle(() => this.#gecmisDegisti());
    // Geçmiş, seçim adımlarını BİZİM üzerimizden geri yükler (bastırma + hizalama).
    gecmis.secimUygulayiciAyarla((kimlikler) => this.#uygula(kimlikler));
  }

  /** Aboneliği bırakır (sekme kapanınca). */
  birak(): void {
    this.#secimCoz?.();
    this.#gecmisCoz?.();
  }

  /** Durumu kayıt yapmadan sıfırlar (belge yeniden yüklenince). */
  sifirla(): void {
    this.#taban = [];
    this.#bekleyen = null;
  }

  // — İç —

  /** İki kimlik listesi aynı KÜMEYİ mi temsil ediyor (sıra önemsiz)? */
  #esitKume(a: readonly string[], b: readonly string[]): boolean {
    if (a.length !== b.length) return false;
    const kume = new Set(a);
    return b.every((k) => kume.has(k));
  }

  /** Bir kimliğin görüntü adı: id > etiket > kimlik. */
  #ad(kimlik: string): string {
    const d = this.cozumle(kimlik);
    return d ? (d.oznitelikler.get('id') ?? d.etiket) : kimlik;
  }

  /** "sec" adımı etiketi (eklenen nesnelere göre). */
  #etiketSec(onceki: readonly string[], sonraki: readonly string[]): string {
    const oncekiKume = new Set(onceki);
    const eklenen = sonraki.filter((k) => !oncekiKume.has(k));
    if (eklenen.length === 1) return `${this.#ad(eklenen[0]!)} seçildi`;
    if (eklenen.length > 1) return `${eklenen.length} nesne seçildi`;
    return `${sonraki.length} nesne seçili`;
  }

  /** "bırak" adımı etiketi. */
  #etiketBirak(onceki: readonly string[]): string {
    return onceki.length === 1 ? `${this.#ad(onceki[0]!)} bırakıldı` : `${onceki.length} nesne bırakıldı`;
  }

  /** Bir seçim adımını geçmişe yazar (taban'ı günceller). */
  #yaz(onceki: readonly string[], sonraki: readonly string[], etiket: string): void {
    this.gecmis.secimAdimiEkle(onceki, sonraki, etiket);
  }

  /** Canlı seçim değişti — §9.6 d–g mantığını uygula (bastırılmadıysa). */
  #secimDegisti(): void {
    if (this.#bastirildi) return;
    // Düzenleme yan etkisi olarak değişen seçim (sil/çoğalt/grupla/çöz sonrası) AYRI
    // bir seçim adımı YAZMAZ (§9.4: bir eylem = tek geri-al); yalnız durumu hizala.
    if (secimKaydiBastirildiMi()) {
      this.#yenidenHizala();
      return;
    }
    // Gerçek bir kullanıcı seçimi, bir navigasyondan (undo) sonra geliyorsa bayat
    // redo dalını atar (§9.6 g): adım yazmayan ertelenen tek seçim bile yeni eylemdir.
    if (this.gecmis.ileriAlinabilir) this.gecmis.ileriDaliTemizle();

    const yeni = this.secim.secililer.map((d) => d.kimlik);
    const n = yeni.length;

    if (n >= 2) {
      // Çoklu → işle. Bekleyen tek varsa önce onu flush et (§9.6 f).
      if (this.#bekleyen) {
        this.#yaz(this.#taban, this.#bekleyen, this.#etiketSec(this.#taban, this.#bekleyen));
        this.#taban = this.#bekleyen;
        this.#bekleyen = null;
      }
      if (!this.#esitKume(this.#taban, yeni)) {
        this.#yaz(this.#taban, yeni, this.#etiketSec(this.#taban, yeni));
        this.#taban = yeni;
      } else {
        // Aynı küme, yalnız sıra/referans değişti (§9.6 b) → adım yazma, taban'ı
        // canlı sırayla eşle (referans = son, geri yüklemede korunsun).
        this.#taban = yeni;
      }
    } else if (n === 1) {
      // Tek → ertele. Bekleyen yoksa ve taban dolu+farklıysa önce bırakma yaz.
      if (!this.#bekleyen && this.#taban.length > 0 && !this.#esitKume(this.#taban, yeni)) {
        // Kalan tek nesne eski seçimin alt kümesiyse "daraltma" (hâlâ seçili), aksi
        // halde gerçek bırakma — etiket buna göre (§9.6 f, panel okunabilirliği).
        const tabanKume = new Set(this.#taban);
        const etiket = yeni.every((k) => tabanKume.has(k))
          ? 'seçim daraltıldı'
          : this.#etiketBirak(this.#taban);
        this.#yaz(this.#taban, [], etiket);
        this.#taban = [];
      }
      this.#bekleyen = yeni;
    } else {
      // Boş → bırakma. Bekleyen tek hiç işlenmemişti → adımsız at; aksi halde bırak.
      if (this.#bekleyen) {
        this.#bekleyen = null;
      } else if (this.#taban.length > 0) {
        this.#yaz(this.#taban, [], this.#etiketBirak(this.#taban));
        this.#taban = [];
      }
    }
  }

  /** Geçmiş bir seçim adımını geri yüklüyor — seçimi kur, sonra durumu hizala. */
  #uygula(kimlikler: readonly string[]): void {
    const dugumler = kimlikler
      .map((k) => this.cozumle(k))
      .filter((d): d is Dugum => d != null);
    this.#bastirildi = true;
    this.secim.cokluSec(dugumler);
    this.#bastirildi = false;
    this.#yenidenHizala();
  }

  /**
   * Navigasyon/bastırılmış değişim sonrası taban/bekleyen'i canlı seçime göre kurar.
   * Geri yüklenen seçim DAİMA geçmişte işlenmiş bir anlık görüntüdür (committed) —
   * tek bile olsa "bekleyen" değildir; bu yüzden taban=canlı, bekleyen=null. Böylece
   * flush'lanmış tek-eleman adımına dönüp uzatınca YİNELENEN adım üretilmez (§9.6 f).
   */
  #yenidenHizala(): void {
    this.#taban = this.secim.secililer.map((d) => d.kimlik);
    this.#bekleyen = null;
  }

  /** Geçmiş değişti — temizlenmişse (toplam 0'a düştü) durumu sıfırla. */
  #gecmisDegisti(): void {
    const toplam = this.gecmis.toplam;
    if (toplam === 0 && this.#sonToplam > 0) {
      this.#bastirildi = true;
      this.sifirla();
      this.#bastirildi = false;
    }
    this.#sonToplam = toplam;
  }
}
