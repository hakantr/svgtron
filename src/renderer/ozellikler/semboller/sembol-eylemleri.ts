import { menuKayitDefteri } from '../../../cekirdek/registry/menu-registry';
import { sembolYap, sembolGenislet } from './semboller';

/**
 * Sembol eylemlerini menü registry'sine kaydeder (İlke 5) — "Düzen" grubunda;
 * menü çubuğu + Komut Paleti'nde otomatik belirir. Kabuk değişmez.
 */
menuKayitDefteri.kaydet({
  id: 'duzen.sembolYap',
  grup: 'duzen',
  etiketAnahtari: 'menu.duzen.sembolYap',
  sira: 10,
  calistir: (b) => {
    if (b.depo.belge) sembolYap(b.depo.belge, b.secim, b.gecmis);
  },
});

menuKayitDefteri.kaydet({
  id: 'duzen.sembolGenislet',
  grup: 'duzen',
  etiketAnahtari: 'menu.duzen.sembolGenislet',
  sira: 11,
  calistir: (b) => {
    if (b.depo.belge) sembolGenislet(b.depo.belge, b.secim, b.gecmis);
  },
});
