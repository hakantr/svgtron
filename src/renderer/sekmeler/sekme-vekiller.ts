import {
  BelgeDeposu,
  type BelgeKaynagi,
} from "../../cekirdek/belge/belge-deposu";
import { SecimDeposu } from "../../cekirdek/secim/secim-deposu";
import { KomutGecmisi } from "../../cekirdek/komutlar/komut-gecmisi";
import type { Dugum } from "../../cekirdek/belge/model/dugum";
import type { Komut } from "../../cekirdek/komutlar/komut";

/**
 * Sekme (çoklu belge) VEKİL store'ları.
 *
 * Paneller store'lara bir kez abone olur (kabuk değişmez); her sekmenin KENDİ gerçek
 * store'ları vardır. Bu vekiller AKTİF sekmenin gerçek store'una delege eder; sekme
 * değişince ({@link aktifAyarla}) yeniden bağlanıp dinleyicilerini uyarır → paneller
 * aktif belgenin verisini yeniden okur. Çekirdek store'lar hiç değişmez (İlke 1);
 * vekil yalnız renderer-tarafı bir yönlendirme katmanıdır.
 *
 * Tip uyumu için her vekil ilgili store'un ALT SINIFIDIR (private alanlar nedeniyle
 * nominal tip); tüm genel üyeler delege edecek şekilde override edilir (miras alınan
 * alanlar kullanılmaz).
 */

/** BelgeDeposu vekili. */
export class BelgeDeposuVekil extends BelgeDeposu {
  #aktif!: BelgeDeposu;
  #coz?: () => void;
  readonly #dinleyiciler = new Set<() => void>();
  aktifAyarla(yeni: BelgeDeposu): void {
    this.#coz?.();
    this.#aktif = yeni;
    this.#coz = yeni.dinle(() => this.#bildir());
    this.#bildir();
  }
  #bildir(): void {
    for (const d of this.#dinleyiciler) d();
  }
  override get belge() {
    return this.#aktif.belge;
  }
  override get kaynak() {
    return this.#aktif.kaynak;
  }
  override get degisti(): boolean {
    return this.#aktif.degisti;
  }
  override kaydedildi(): void {
    this.#aktif.kaydedildi();
  }
  override yukle(svgMetni: string, kaynak?: BelgeKaynagi): void {
    this.#aktif.yukle(svgMetni, kaynak);
  }
  override dinle(d: () => void): () => void {
    this.#dinleyiciler.add(d);
    return () => this.#dinleyiciler.delete(d);
  }
}

/** SecimDeposu vekili. */
export class SecimDeposuVekil extends SecimDeposu {
  #aktif!: SecimDeposu;
  #coz?: () => void;
  readonly #dinleyiciler = new Set<() => void>();
  aktifAyarla(yeni: SecimDeposu): void {
    this.#coz?.();
    this.#aktif = yeni;
    this.#coz = yeni.dinle(() => this.#bildir());
    this.#bildir();
  }
  #bildir(): void {
    for (const d of this.#dinleyiciler) d();
  }
  override get secili(): Dugum | null {
    return this.#aktif.secili;
  }
  override get secililer(): readonly Dugum[] {
    return this.#aktif.secililer;
  }
  override icindeMi(d: Dugum): boolean {
    return this.#aktif.icindeMi(d);
  }
  override sec(d: Dugum | null): void {
    this.#aktif.sec(d);
  }
  override cokluSec(ds: readonly Dugum[]): void {
    this.#aktif.cokluSec(ds);
  }
  override ekle(d: Dugum): void {
    this.#aktif.ekle(d);
  }
  override cikar(d: Dugum): void {
    this.#aktif.cikar(d);
  }
  override degistir(d: Dugum): void {
    this.#aktif.degistir(d);
  }
  override temizle(): void {
    this.#aktif.temizle();
  }
  override dinle(d: () => void): () => void {
    this.#dinleyiciler.add(d);
    return () => this.#dinleyiciler.delete(d);
  }
}

/** KomutGecmisi vekili. */
export class KomutGecmisiVekil extends KomutGecmisi {
  #aktif!: KomutGecmisi;
  #coz?: () => void;
  readonly #dinleyiciler = new Set<() => void>();
  aktifAyarla(yeni: KomutGecmisi): void {
    this.#coz?.();
    this.#aktif = yeni;
    this.#coz = yeni.dinle(() => this.#bildir());
    this.#bildir();
  }
  #bildir(): void {
    for (const d of this.#dinleyiciler) d();
  }
  override calistir(k: Komut): void {
    this.#aktif.calistir(k);
  }
  override secimUygulayiciAyarla(
    fn: (kimlikler: readonly string[]) => void,
  ): void {
    this.#aktif.secimUygulayiciAyarla(fn);
  }
  override secimAdimiEkle(
    onceki: readonly string[],
    sonraki: readonly string[],
    etiket: string,
  ): void {
    this.#aktif.secimAdimiEkle(onceki, sonraki, etiket);
  }
  override get geriAlinabilir(): boolean {
    return this.#aktif.geriAlinabilir;
  }
  override get ileriAlinabilir(): boolean {
    return this.#aktif.ileriAlinabilir;
  }
  override geriAl(): void {
    this.#aktif.geriAl();
  }
  override ileriAl(): void {
    this.#aktif.ileriAl();
  }
  override ileriDaliTemizle(): void {
    this.#aktif.ileriDaliTemizle();
  }
  override temizle(): void {
    this.#aktif.temizle();
  }
  override girisler(): ReturnType<KomutGecmisi["girisler"]> {
    return this.#aktif.girisler();
  }
  override get konum(): number {
    return this.#aktif.konum;
  }
  override get toplam(): number {
    return this.#aktif.toplam;
  }
  override konumaGit(hedef: number): void {
    this.#aktif.konumaGit(hedef);
  }
  override dinle(d: () => void): () => void {
    this.#dinleyiciler.add(d);
    return () => this.#dinleyiciler.delete(d);
  }
}

/**
 * Güvenlik ağı (TK-30 inceleme): vekil, taban store'un TÜM genel üyelerini override
 * ETMELİ — etmezse miras alınan (boş) store'a sessizce delege eder ve panel boş veri
 * okur; alt-sınıflama bunu derlemede yakalamaz. Yükleme anında karşılaştırıp eksik
 * varsa yüksek sesle bildir (çekirdek store'a yeni üye eklenince fark edilir).
 */
function vekilTamMi(vekilProto: object, tabanProto: object, ad: string): void {
  const taban = Object.getOwnPropertyNames(tabanProto).filter(
    (n) => n !== "constructor",
  );
  const vekil = new Set(Object.getOwnPropertyNames(vekilProto));
  const eksik = taban.filter((n) => !vekil.has(n));
  if (eksik.length)
    console.error(`[sekme-vekil] ${ad} eksik override: ${eksik.join(", ")}`);
}
vekilTamMi(
  BelgeDeposuVekil.prototype,
  BelgeDeposu.prototype,
  "BelgeDeposuVekil",
);
vekilTamMi(
  SecimDeposuVekil.prototype,
  SecimDeposu.prototype,
  "SecimDeposuVekil",
);
vekilTamMi(
  KomutGecmisiVekil.prototype,
  KomutGecmisi.prototype,
  "KomutGecmisiVekil",
);
