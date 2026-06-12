import type { MenuBaglami } from '../../../cekirdek/registry/menu-registry';
import { menuKayitDefteri } from '../../../cekirdek/registry/menu-registry';
import { OznitelikDegistirKomutu } from '../../../cekirdek/komutlar/oznitelik-degistir-komutu';
import { BilesikKomut } from '../../../cekirdek/komutlar/dugum-komutlari';
import { cizimErisimi } from '../../tuval/cizim-erisimi';
import { say } from '../../tuval/donusum';

/**
 * Yansıt (Yatay/Dikey) — seçili nesneleri ortak sınır kutusu merkezinde aynalar
 * (§9.2). Belge durumu → tek Command (İlke 2). Flip, eleman transform'unun başına
 * eklenir (kök-uzayı; kök çocukları için tam — gruplu için yaklaşık).
 */
function yansit(baglam: MenuBaglami, yatay: boolean): void {
  const belge = baglam.depo.belge;
  const sec = baglam.secim.secililer;
  if (!belge || sec.length === 0) return;

  let kok: SVGSVGElement | null = null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const d of sec) {
    const el = cizimErisimi.eleman(d.kimlik);
    if (!(el instanceof SVGGraphicsElement)) continue;
    if (!kok) kok = el.ownerSVGElement;
    const r = el.getBoundingClientRect();
    minX = Math.min(minX, r.left);
    minY = Math.min(minY, r.top);
    maxX = Math.max(maxX, r.right);
    maxY = Math.max(maxY, r.bottom);
  }
  const inv = kok?.getScreenCTM()?.inverse();
  if (!inv || !Number.isFinite(minX)) return;

  const c = new DOMPoint((minX + maxX) / 2, (minY + maxY) / 2).matrixTransform(inv);
  const cx = say(c.x);
  const cy = say(c.y);
  const sx = yatay ? -1 : 1;
  const sy = yatay ? 1 : -1;
  const flip = `translate(${cx}, ${cy}) scale(${sx}, ${sy}) translate(${-cx}, ${-cy})`;

  const komutlar = sec.map((d) => {
    const eski = d.oznitelikler.get('transform');
    return new OznitelikDegistirKomutu(belge, d, 'transform', `${flip}${eski ? ' ' + eski : ''}`);
  });
  baglam.gecmis.calistir(new BilesikKomut(yatay ? 'yatay yansıt' : 'dikey yansıt', komutlar));
}

menuKayitDefteri.kaydet({
  id: 'duzen.yansitYatay',
  grup: 'donustur',
  etiketAnahtari: 'menu.donustur.yansitYatay',
  sira: 12,
  calistir: (b) => yansit(b, true),
});
menuKayitDefteri.kaydet({
  id: 'duzen.yansitDikey',
  grup: 'donustur',
  etiketAnahtari: 'menu.donustur.yansitDikey',
  sira: 13,
  calistir: (b) => yansit(b, false),
});
