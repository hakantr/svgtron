import { gez, type Dugum } from './dugum';

/**
 * Dışa aktarıcı (CLAUDE.md İlke 8 — üretirken tutucu, profile göre).
 *
 * Modeli tek sabit SVG sürümüne değil, seçilen bir PROFİLE göre yazar:
 *  - `blink`            → en modern/kısa (uygulama-içi varsayılan)
 *  - `genis-uyumluluk`  → Safari dahil her yerde render olan güvenli alt küme
 *
 * Üretim tavanı Blink'in fiilen desteklediği kümedir; kara listedeki yapılar
 * (mesh, hatch, solidColor, SVG-font, tref, animateColor…) ASLA üretilmez
 * (§10.10). Profil farkları özellik geldikçe zenginleşecek; şimdilik iskelet
 * yerinde ve düğümler sadık biçimde seri hâle getirilir.
 */
export type DisaAktarimProfili = 'blink' | 'genis-uyumluluk';

/** Asla üretilmeyecek etiketler (okurken kabul edilir, yazarken atılır). */
const KARA_LISTE = new Set([
  'mesh',
  'meshGradient',
  'meshrow',
  'meshpatch',
  'hatch',
  'hatchpath',
  'solidColor',
  'font',
  'glyph',
  'missing-glyph',
  'hkern',
  'vkern',
  'tref',
  'animateColor',
]);

export function xmlKacis(deger: string): string {
  return deger
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function metinKacis(deger: string): string {
  return deger.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Boşluğu ANLAMLI olan elemanlar: alt ağaçları satır-içi (biçimsiz) yazılır,
 * aksi halde eklenen girinti/yeni satır render edilen metni bozardı.
 */
const METIN_ELEMANLARI = new Set(['text', 'tspan', 'textPath']);

/** Boşluğu anlamlı (satır-içi yazılan) bir metin elemanı mı? (kod görünümü için.) */
export function metinElemaniMi(etiket: string): boolean {
  return METIN_ELEMANLARI.has(etiket);
}

export function oznitelikDizesi(dugum: Dugum): string {
  return [...dugum.oznitelikler.entries()]
    .map(([ad, deger]) => ` ${ad}="${xmlKacis(deger)}"`)
    .join('');
}

/**
 * İlke 10: editör kontrol durumunu (kilit, artboard) nesnenin ÜSTÜNE yazılacak
 * tek bir SVG yorumuna kodlar (örn. `<!-- @svgtron lock=true artboard=true -->`).
 * Hiç bayrak yoksa `null` döner (yorum yazılmaz). Artboard daima kilitli olduğundan
 * ikisi birlikte görünür; yine de bağımsız kodlanır (ileride ayrışabilir).
 */
export function editorYorumDizesi(dugum: Dugum): string | null {
  const bayraklar: string[] = [];
  if (dugum.kilitli) bayraklar.push('lock=true');
  if (dugum.artboard) bayraklar.push('artboard=true');
  if (bayraklar.length === 0) return null;
  return `<!-- @svgtron ${bayraklar.join(' ')} -->`;
}

/**
 * Bir düğümü ve alt ağacını BİÇİMSİZ (tek satır, hiç boşluk eklemeden) yazar —
 * metin elemanlarının ve `<style>` içeriğinin anlamlı boşluğu korunsun diye.
 */
function dugumYazDuz(dugum: Dugum, parcalar: string[], editorYorumu: boolean): void {
  if (KARA_LISTE.has(dugum.etiket)) return; // üretme (§10.10)
  if (editorYorumu) {
    const yorum = editorYorumDizesi(dugum);
    if (yorum) parcalar.push(yorum);
  }

  const oz = oznitelikDizesi(dugum);
  if (dugum.cocuklar.length === 0 && dugum.metin === undefined) {
    parcalar.push(`<${dugum.etiket}${oz}/>`);
    return;
  }
  parcalar.push(`<${dugum.etiket}${oz}>`);
  if (dugum.metin !== undefined) parcalar.push(metinKacis(dugum.metin));
  for (const cocuk of dugum.cocuklar) dugumYazDuz(cocuk, parcalar, editorYorumu);
  parcalar.push(`</${dugum.etiket}>`);
}

/**
 * Biçimli (girintili) yazar. Yapısal elemanların çocukları yeni satıra girintilenir;
 * metin elemanları (text/tspan/textPath), metin-yaprakları ve boş elemanlar SATIR-İÇİ
 * kalır → text/`<style>` içindeki anlamlı boşluk bozulmaz. (Elemanlar arası boşluk
 * SVG'de yok sayılır ve içe-aktarımda atılır → round-trip temiz.)
 */
function dugumYazBicimli(
  dugum: Dugum,
  parcalar: string[],
  derinlik: number,
  editorYorumu: boolean,
): void {
  if (KARA_LISTE.has(dugum.etiket)) return; // üretme (§10.10)
  const girinti = '  '.repeat(derinlik);

  // İlke 10: kilit/artboard gibi kontrol durumu, nesnenin ÜSTÜNE yorumla yazılır.
  if (editorYorumu) {
    const yorum = editorYorumDizesi(dugum);
    if (yorum) parcalar.push(`${girinti}${yorum}\n`);
  }

  const metinYaprak = dugum.metin !== undefined && dugum.cocuklar.length === 0;
  const bosMu = dugum.cocuklar.length === 0 && dugum.metin === undefined;
  const satirIci = bosMu || metinYaprak || METIN_ELEMANLARI.has(dugum.etiket);

  if (satirIci) {
    const ic: string[] = [];
    dugumYazDuz(dugum, ic, false); // kilit yorumu yukarıda yazıldı
    parcalar.push(girinti + ic.join('') + '\n');
    return;
  }

  parcalar.push(`${girinti}<${dugum.etiket}${oznitelikDizesi(dugum)}>\n`);
  // Karışık içerik (metin + element çocuk) nadir ama metni DÜŞÜRME (dugumYazDuz ile
  // tutarlı; sessiz kayıp olmasın).
  if (dugum.metin !== undefined) parcalar.push(`${'  '.repeat(derinlik + 1)}${metinKacis(dugum.metin)}\n`);
  for (const cocuk of dugum.cocuklar) dugumYazBicimli(cocuk, parcalar, derinlik + 1, editorYorumu);
  parcalar.push(`${girinti}</${dugum.etiket}>\n`);
}

/**
 * TEK bir düğümü (ve alt ağacını) biçimsiz SVG metnine serileştirir — örn. Tanımlar
 * paneli önizlemesinde bir kaynağı (gradient/marker/filter…) küçük bir `<svg><defs>`
 * içine koymak için. Editör yorumu yazılmaz.
 */
export function dugumSerile(dugum: Dugum): string {
  const parcalar: string[] = [];
  dugumYazDuz(dugum, parcalar, false);
  return parcalar.join('');
}

/**
 * Belge modelini, verilen profile göre SVG metnine dönüştürür.
 * @param bicimli Girintili/okunabilir çıktı (varsayılan). Metin elemanları satır-içi
 *   kalır → render bozulmaz. `false` ise tek satır (biçimsiz).
 */
export function disaAktar(
  kok: Dugum,
  profil: DisaAktarimProfili = 'blink',
  bicimli = true,
): string {
  const parcalar: string[] = [];
  // Uygulama profili editör yorumlarını yazar; "geniş uyumluluk" temiz bırakır.
  const editorYorumu = profil === 'blink';
  if (bicimli) dugumYazBicimli(kok, parcalar, 0, editorYorumu);
  else dugumYazDuz(kok, parcalar, editorYorumu);
  return parcalar.join('');
}

/** Kara listedeki, üretilmeyecek bir etiket mi? (uyarı/raporlama için) */
export function uretilemez(etiket: string): boolean {
  return KARA_LISTE.has(etiket);
}

/** Modelde kara listede olup atılacak düğümlerin etiketleri (rapor için). */
export function uretilemezEtiketler(kok: Dugum): string[] {
  const bulunan = new Set<string>();
  for (const d of gez(kok)) if (KARA_LISTE.has(d.etiket)) bulunan.add(d.etiket);
  return [...bulunan];
}
