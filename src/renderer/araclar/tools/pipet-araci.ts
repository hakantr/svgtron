import { svg } from 'lit';
import { aracKayitDefteri, type Arac } from '../arac';
import { BilesikKomut } from '../../../cekirdek/komutlar/dugum-komutlari';
import { cizimErisimi } from '../../tuval/cizim-erisimi';
import { stilUygulaKomutu } from '../../boya/stil-uygula';
import { t } from '../../diller/dil';

/**
 * Pipet (§9.2) — sahnedeki bir renkten dolgu alır. Kullanım: önce **hedef**
 * nesne(ler)i seç, sonra Pipet'le bir **kaynağa** tıkla → kaynağın efektif dolgusu
 * (getComputedStyle) hedeflere inline `fill` olarak uygulanır (tek Command, İlke 2).
 */
const pipetAraci: Arac = {
  id: 'pipet',
  etiketAnahtari: 'arac.pipet',
  imlec: 'crosshair',
  sira: 20,
  ikon: svg`<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M10.5 2.5 a1.6 1.6 0 0 1 3 3 L7 12 L3.5 12.5 L4 9 Z"/><path d="M8.5 5.5 L11 8"/></svg>`,

  tikla(olay, baglam) {
    const kaynak = baglam.isabet(olay);
    const belge = baglam.depo.belge;
    if (!kaynak || !belge) return;
    const el = cizimErisimi.eleman(kaynak.kimlik);
    if (!(el instanceof Element)) return;
    // İş akışı: önce HEDEF nesne(ler)i seç, sonra Pipet'le KAYNAĞA tıkla.
    // Hedef seçili değilse sessiz kalmak yerine kullanıcıyı uyar (Y3).
    const hedefler = baglam.secim.secililer.filter((d) => d !== kaynak);
    if (hedefler.length === 0) {
      baglam.bildir(t('pipet.hedefYok'), 'uyari');
      return;
    }
    const dolgu = getComputedStyle(el).fill;
    baglam.gecmis.calistir(
      new BilesikKomut(
        'pipet (dolgu)',
        hedefler.map((d) => stilUygulaKomutu(belge, d, 'fill', dolgu)),
      ),
    );
  },
};

aracKayitDefteri.kaydet(pipetAraci);
