import { svg } from 'lit';
import { aracKayitDefteri, type Arac } from '../arac';
import { dugumOlustur } from '../../../cekirdek/belge/model/dugum';
import { DugumEkleKomutu } from '../../../cekirdek/komutlar/dugum-komutlari';
import { say } from '../../tuval/donusum';
import { t } from '../../diller/dil';

/**
 * Görsel Yerleştir (§9.2, §10.3) — tıklanan yere bir `<image>` koyar. Görsel,
 * main süreçteki dosya servisinden **data-URI** olarak gelir (İlke 1/4; renderer
 * fs görmez) ve SVG'ye gömülür → çıktı kendi kendine yeten kalır. Doğal boyut
 * görselin yüklenmesiyle alınır. Tek Command (İlke 2).
 */
const gorselAraci: Arac = {
  id: 'gorsel',
  etiketAnahtari: 'arac.gorsel',
  imlec: 'crosshair',
  sira: 18,
  ikon: svg`<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="2" y="3" width="12" height="10" rx="1.2"/><circle cx="5.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/><path d="M3 12 L6.5 8.5 L9 11 L11 9 L13 11.5"/></svg>`,

  tikla(olay, baglam) {
    const nokta = baglam.svgKonum(olay);
    const belge = baglam.depo.belge;
    if (!belge) return;
    void (async () => {
      try {
        const sonuc = await window.api.gorselAc();
        if (!sonuc) return;
        const img = new Image();
        img.onload = (): void => {
          const w = img.naturalWidth || 120;
          const h = img.naturalHeight || 120;
          const dugum = dugumOlustur('image', {
            x: String(say(nokta.x)),
            y: String(say(nokta.y)),
            width: String(w),
            height: String(h),
            href: sonuc.dataUri,
          });
          baglam.gecmis.calistir(new DugumEkleKomutu(belge, belge.kok, dugum));
          baglam.secim.sec(dugum);
        };
        // Çözülemeyen/desteklenmeyen veride 'load' yerine 'error' tetiklenir;
        // sessizce hiçbir şey eklenmesin diye kullanıcıya bildirilir (düğüm üretilmez).
        img.onerror = (): void => baglam.bildir(t('gorsel.yuklenemedi'), 'hata');
        img.src = sonuc.dataUri;
      } catch {
        baglam.bildir(t('gorsel.yuklenemedi'), 'hata');
      }
    })();
  },
};

aracKayitDefteri.kaydet(gorselAraci);
