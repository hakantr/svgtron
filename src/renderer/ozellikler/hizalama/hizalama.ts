import type { Belge } from '../../../cekirdek/belge/belge';
import type { SecimDeposu } from '../../../cekirdek/secim/secim-deposu';
import { gez, type Dugum } from '../../../cekirdek/belge/model/dugum';
import type { Komut } from '../../../cekirdek/komutlar/komut';
import { BilesikKomut } from '../../../cekirdek/komutlar/dugum-komutlari';
import { OznitelikDegistirKomutu } from '../../../cekirdek/komutlar/oznitelik-degistir-komutu';
import { cizimErisimi } from '../../tuval/cizim-erisimi';
import { ekranDeltaKullanici, transformTasi } from '../../tuval/donusum';
import { hizalaReferans, type HizalaReferans } from './hizala-referans';

/**
 * Hizalama / dağıtma (§9.2) — seçili nesneleri bir REFERANSA göre hizalar ya da
 * eşit dağıtır. Nesneleri taşıdığı için bir BELGE durumu değişikliğidir → tek
 * BilesikKomut (İlke 2/9). Referansın NE olduğu {@link hizalaReferans} tercihiyle
 * belirlenir (varsayılan "son seçilene göre"); tercih görünüm durumudur (undo'ya
 * girmez), sonuç yine tek Command'dır.
 */
export type HizalaModu =
  | 'sol'
  | 'yatay-merkez'
  | 'sag'
  | 'ust'
  | 'dikey-orta'
  | 'alt'
  | 'dagit-yatay'
  | 'dagit-dikey';

/** Ekran-uzayı kenarları (referans/sınır kutusu). */
interface Kenarlar {
  sol: number;
  sag: number;
  ust: number;
  alt: number;
}

function kutu(dugum: Dugum): DOMRect | null {
  const el = cizimErisimi.eleman(dugum.kimlik);
  return el instanceof SVGGraphicsElement ? el.getBoundingClientRect() : null;
}

/** Bir DOMRect'i Kenarlar'a çevirir. */
function kenarlar(r: DOMRect): Kenarlar {
  return { sol: r.left, sag: r.right, ust: r.top, alt: r.bottom };
}

/** Birden çok rect'in toplu (birleşim) sınır kutusu. */
function topluKutu(rects: DOMRect[]): Kenarlar {
  return {
    sol: Math.min(...rects.map((r) => r.left)),
    sag: Math.max(...rects.map((r) => r.right)),
    ust: Math.min(...rects.map((r) => r.top)),
    alt: Math.max(...rects.map((r) => r.bottom)),
  };
}

/**
 * Hizalama referans kutusunu tercihe göre (§9.2) ekran uzayında verir.
 * `secim`/null → çağıran toplu kutuya düşer (referans nesne/belge bulunamadı).
 */
function referansKutusu(
  belge: Belge,
  secim: SecimDeposu,
  kayit: { d: Dugum; r: DOMRect }[],
  ref: HizalaReferans,
): Kenarlar | null {
  if (ref === 'son-secilen') {
    const sec = secim.secili;
    const k = sec ? kayit.find((x) => x.d === sec) : null;
    return k ? kenarlar(k.r) : null;
  }
  if (ref === 'anahtar') {
    // z-sıralamada EN ÜSTTEKİ = belge traversal'inde en SONDAKİ seçili düğüm.
    const sira = new Map<Dugum, number>();
    let i = 0;
    for (const d of gez(belge.kok)) sira.set(d, i++);
    let enUst: { d: Dugum; r: DOMRect } | null = null;
    for (const k of kayit) {
      if (!enUst || (sira.get(k.d) ?? -1) > (sira.get(enUst.d) ?? -1)) enUst = k;
    }
    return enUst ? kenarlar(enUst.r) : null;
  }
  if (ref === 'belge') {
    // viewBox / artboard sınırları (artboard varsa onu, yoksa kök <svg>).
    const artboard = belge.kok.cocuklar.find((c) => c.artboard);
    const hedef = artboard ? cizimErisimi.eleman(artboard.kimlik) : cizimErisimi.eleman(belge.kok.kimlik);
    return hedef instanceof SVGGraphicsElement ? kenarlar(hedef.getBoundingClientRect()) : null;
  }
  return null; // 'secim' → toplu kutu (çağıran hesaplar)
}

/** Ekran-uzayı (sdx, sdy) ötelemesini düğüme uygulayan komut (ebeveyn CTM ile). */
function tasiKomut(belge: Belge, dugum: Dugum, sdx: number, sdy: number): Komut | null {
  if (sdx === 0 && sdy === 0) return null;
  const el = cizimErisimi.eleman(dugum.kimlik);
  const ctm = (el?.parentElement as unknown as SVGGraphicsElement | null)?.getScreenCTM?.();
  if (!ctm) return null;
  const d = ekranDeltaKullanici(ctm, sdx, sdy);
  return new OznitelikDegistirKomutu(
    belge,
    dugum,
    'transform',
    transformTasi(dugum.oznitelikler.get('transform') ?? '', d.x, d.y),
  );
}

export function hizala(belge: Belge, secim: SecimDeposu, mod: HizalaModu): Komut | null {
  const kayit = secim.secililer
    .map((d) => ({ d, r: kutu(d) }))
    .filter((x): x is { d: Dugum; r: DOMRect } => x.r !== null);
  if (kayit.length < 2) return null;

  const komutlar: (Komut | null)[] = [];

  if (mod === 'dagit-yatay' || mod === 'dagit-dikey') {
    // Dağıtım nesneler ARASINDA eşitler; referans tercihi uygulanmaz (§9.2).
    if (kayit.length < 3) return null;
    const yatay = mod === 'dagit-yatay';
    const merkez = (r: DOMRect) => (yatay ? (r.left + r.right) / 2 : (r.top + r.bottom) / 2);
    const sirali = [...kayit].sort((a, b) => merkez(a.r) - merkez(b.r));
    const ilk = merkez(sirali[0]!.r);
    const son = merkez(sirali.at(-1)!.r);
    const adim = (son - ilk) / (sirali.length - 1);
    sirali.forEach((k, i) => {
      const fark = ilk + adim * i - merkez(k.r);
      komutlar.push(tasiKomut(belge, k.d, yatay ? fark : 0, yatay ? 0 : fark));
    });
  } else {
    // Hizalama REFERANSINA göre (§9.2): tercihten gelen kutu; yoksa toplu kutu.
    const r = referansKutusu(belge, secim, kayit, hizalaReferans.mod) ?? topluKutu(kayit.map((k) => k.r));
    const mx = (r.sol + r.sag) / 2;
    const my = (r.ust + r.alt) / 2;
    for (const k of kayit) {
      let sdx = 0;
      let sdy = 0;
      if (mod === 'sol') sdx = r.sol - k.r.left;
      else if (mod === 'sag') sdx = r.sag - k.r.right;
      else if (mod === 'yatay-merkez') sdx = mx - (k.r.left + k.r.right) / 2;
      else if (mod === 'ust') sdy = r.ust - k.r.top;
      else if (mod === 'alt') sdy = r.alt - k.r.bottom;
      else if (mod === 'dikey-orta') sdy = my - (k.r.top + k.r.bottom) / 2;
      komutlar.push(tasiKomut(belge, k.d, sdx, sdy));
    }
  }

  const gecerli = komutlar.filter((k): k is Komut => k !== null);
  return gecerli.length ? new BilesikKomut('hizala', gecerli) : null;
}
