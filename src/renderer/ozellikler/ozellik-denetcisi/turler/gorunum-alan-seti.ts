import { html, type TemplateResult } from 'lit';
import {
  alanSetiKayitDefteri,
  type AlanSeti,
  type AlanSetiBaglami,
} from './alan-seti-registry';
import { cizimErisimi } from '../../../tuval/cizim-erisimi';
import { t } from '../../../diller/dil';
import '../../../boya/boya-secici';
import { fillToBoya, gradyanKomutu, eskiGradyanTemizle, urlId } from '../../../boya/gradyan-model';
import { stilUygulaKomutu } from '../../../boya/stil-uygula';
import type { BoyaDegeri } from '../../../boya/boya-degeri';
import { BilesikKomut } from '../../../../cekirdek/komutlar/dugum-komutlari';

/** Görünüm alanlarına sahip grafik elemanlar. */
const GRAFIK = new Set([
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'path',
  'text',
  'tspan',
  'g',
  'image',
  'use',
  'foreignObject',
]);

/** 'rgb(r, g, b)' → '#rrggbb'; renk değilse null. */
function rgbHex(deger: string): string | null {
  const m = deger.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (!m) return null;
  const h = (n: string) => Number(n).toString(16).padStart(2, '0');
  return `#${h(m[1]!)}${h(m[2]!)}${h(m[3]!)}`;
}

/**
 * "Görünüm" alan seti — dolgu, kontur (renk/kalınlık), saydamlık.
 *
 * Değerleri render edilen elemanın HESAPLANMIŞ stilinden okur; yazarken INLINE
 * STYLE'a yazar (Command ile) — CSS sınıfı olsa bile uygulanır (TK-5). Renk
 * seçimi gelişmiş boya seçiciyledir; gradyan seçilince defs'e kaynak yazılır (TK-6).
 */
const gorunumAlanSeti: AlanSeti = {
  id: 'gorunum',
  baslikAnahtari: 'denetci.grup.gorunum',
  sira: 10,
  uygunMu: (dugum) => GRAFIK.has(dugum.etiket),
  render: (baglam) => {
    const { dugum } = baglam;
    const el = cizimErisimi.eleman(dugum.kimlik);
    const h = el ? getComputedStyle(el) : null;

    // Stil yazımı moda göre (inline/css/otomatik) tek yerden yönetilir (TK-18).
    const stilYaz = (ozellik: string, deger: string): void =>
      baglam.komut(stilUygulaKomutu(baglam.belge, dugum, ozellik, deger));

    const fill = h?.fill || dugum.oznitelikler.get('fill') || '';
    const stroke = h?.stroke || dugum.oznitelikler.get('stroke') || 'none';
    const strokeW = (h?.strokeWidth || dugum.oznitelikler.get('stroke-width') || '1').replace('px', '');
    const opacity = h?.opacity ?? dugum.oznitelikler.get('opacity') ?? '1';
    const opNum = Number(opacity);

    return html`
      ${renkAlani(baglam, t('denetci.alan.fill'), 'fill', fill)}
      ${renkAlani(baglam, t('denetci.alan.stroke'), 'stroke', stroke)}

      <div class="alan">
        <label>${t('denetci.alan.strokeWidth')}</label>
        <input
          type="number"
          step="any"
          min="0"
          .value=${strokeW}
          @change=${(e: Event) => {
            const v = (e.target as HTMLInputElement).value.trim();
            const n = Number(v);
            if (v === '' || !Number.isFinite(n)) {
              (e.target as HTMLInputElement).value = strokeW;
              return;
            }
            stilYaz('stroke-width', String(n));
          }}
        />
      </div>

      <div class="alan">
        <label>${t('denetci.alan.opacity')}</label>
        <div class="satir">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            .value=${String(Number.isFinite(opNum) ? opNum : 1)}
            @change=${(e: Event) => stilYaz('opacity', (e.target as HTMLInputElement).value)}
          />
          <span class="deger">${(Number.isFinite(opNum) ? opNum : 1).toFixed(2)}</span>
        </div>
      </div>
    `;
  },
};

/** Renk alanı: gelişmiş boya seçici + metin (url/none/renk). */
function renkAlani(
  baglam: AlanSetiBaglami,
  etiket: string,
  ozellik: 'fill' | 'stroke',
  hamDeger: string,
): TemplateResult {
  const boya = fillToBoya(hamDeger, baglam.belge);
  const hx = rgbHex(hamDeger);
  const gradyanMi = boya.tip === 'gradyan';

  // Düz renk / yok yazarken, hamDeger BİZİM bir gradyanımıza atıf veriyorsa onu
  // da defs'ten temizle (öksüz kaynak kalmasın, TK-6) — tek geri-al adımı.
  const boyaYaz = (deger: string): void => {
    const stilKomut = stilUygulaKomutu(baglam.belge, baglam.dugum, ozellik, deger);
    const temizle = eskiGradyanTemizle(baglam.belge, hamDeger);
    baglam.komut(temizle ? new BilesikKomut('boya değiştir', [stilKomut, temizle]) : stilKomut);
  };

  const uygula = (b: BoyaDegeri): void => {
    if (b.tip === 'gradyan') baglam.komut(gradyanKomutu(baglam.belge, baglam.dugum, hamDeger, b, ozellik));
    else boyaYaz(b.tip === 'yok' ? 'none' : b.renk);
  };

  return html`
    <div class="alan">
      <label>${etiket}</label>
      <div class="satir">
        <boya-secici
          .deger=${boya}
          @degisti=${(e: CustomEvent<BoyaDegeri>) => uygula(e.detail)}
        ></boya-secici>
        <input
          type="text"
          .value=${gradyanMi ? `url(#${urlId(hamDeger) ?? ''})` : (hx ?? hamDeger)}
          ?disabled=${gradyanMi}
          placeholder="#ff0000, url(#id), none"
          @change=${(e: Event) => boyaYaz((e.target as HTMLInputElement).value)}
        />
      </div>
    </div>
  `;
}

alanSetiKayitDefteri.kaydet(gorunumAlanSeti);
