import { menuKayitDefteri, type MenuBaglami } from '../../../cekirdek/registry/menu-registry';
import { booleUygula, type BoolIslem } from './bool';
import { t } from '../../diller/dil';

/**
 * Boole (yol) işlemlerini menü registry'sine kaydeder (İlke 5, §11.2). "Yol"
 * grubu olarak menü çubuğunda VE Komut Paleti'nde otomatik belirir; kabuk
 * değişmez. Her eylem belge durumunu değiştirir → Command (booleUygula içinde).
 */
function eylem(baglam: MenuBaglami, islem: BoolIslem): void {
  const belge = baglam.depo.belge;
  if (!belge) return;
  const sonuc = booleUygula(belge, baglam.secim, baglam.gecmis, islem);
  if (sonuc === 'yetersiz') baglam.hataBildir(t('bool.yetersiz'));
  else if (sonuc === 'bos') baglam.hataBildir(t('bool.bos'));
}

const ISLEMLER: { id: string; islem: BoolIslem; anahtar: string }[] = [
  { id: 'yol.birlesim', islem: 'birlesim', anahtar: 'menu.yol.birlesim' },
  { id: 'yol.fark', islem: 'fark', anahtar: 'menu.yol.fark' },
  { id: 'yol.kesisim', islem: 'kesisim', anahtar: 'menu.yol.kesisim' },
  { id: 'yol.disla', islem: 'disla', anahtar: 'menu.yol.disla' },
];

ISLEMLER.forEach((x, i) =>
  menuKayitDefteri.kaydet({
    id: x.id,
    grup: 'yol',
    etiketAnahtari: x.anahtar,
    sira: i,
    calistir: (baglam) => eylem(baglam, x.islem),
  }),
);
