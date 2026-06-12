import { dugumOlustur, gez, benzersizId, type Dugum } from '../../../../cekirdek/belge/model/dugum';
import type { Belge } from '../../../../cekirdek/belge/belge';
import type { Komut } from '../../../../cekirdek/komutlar/komut';
import {
  BilesikKomut,
  DugumCikarKomutu,
  DugumEkleKomutu,
} from '../../../../cekirdek/komutlar/dugum-komutlari';
import { kaynakTuruKayitDefteri } from '../../../../cekirdek/registry/kaynak-turu-registry';
import { stilUygulaKomutu } from '../../../boya/stil-uygula';
import { kaynakGorunumKaydet, defsOnizleme } from '../kaynak-gorunum';

/**
 * clipPath (kırpma) kaynak türü (CLAUDE.md Faz G+, §8.1, §10.6). Uygulama
 * stratejisi `clip-path="url(#id)"`. Listele · uygula · oluştur (daire kırpma) · sil.
 */

function defsBul(belge: Belge): Dugum | null {
  return belge.kok.cocuklar.find((d) => d.etiket === 'defs') ?? null;
}
function kirpmaDugumu(belge: Belge, id: string): Dugum | null {
  for (const d of gez(belge.kok)) if (d.etiket === 'clipPath' && d.oznitelikler.get('id') === id) return d;
  return null;
}

kaynakTuruKayitDefteri.kaydet({
  id: 'clipPath',
  etiket: 'Kırpma (clipPath)',

  listele(belge) {
    const ogeler: { id: string; etiket: string }[] = [];
    for (const d of gez(belge.kok)) {
      const id = d.oznitelikler.get('id');
      if (d.etiket === 'clipPath' && id) ogeler.push({ id, etiket: id });
    }
    return ogeler;
  },

  uygula(belge, dugumler, kaynakId): Komut | null {
    if (dugumler.length === 0) return null;
    return new BilesikKomut(
      'kırpma uygula',
      dugumler.map((d) => stilUygulaKomutu(belge, d, 'clip-path', `url(#${kaynakId})`)),
    );
  },

  olustur(belge): Komut {
    const komutlar: Komut[] = [];
    let defs = defsBul(belge);
    if (!defs) {
      defs = dugumOlustur('defs');
      komutlar.push(new DugumEkleKomutu(belge, belge.kok, defs, 0));
    }
    const id = benzersizId(belge.kok, 'svgtron-kirpma-');
    const kirpma = dugumOlustur('clipPath', { id }, [
      dugumOlustur('circle', { cx: '50', cy: '50', r: '40' }),
    ]);
    komutlar.push(new DugumEkleKomutu(belge, defs, kirpma));
    return new BilesikKomut('kırpma oluştur', komutlar);
  },

  sil(belge, kaynakId): Komut | null {
    const defs = defsBul(belge);
    const kirpma = kirpmaDugumu(belge, kaynakId);
    if (!defs || !kirpma || !defs.cocuklar.includes(kirpma)) return null;
    return new DugumCikarKomutu(belge, defs, kirpma);
  },
});

/**
 * Kırpma GÖRÜNÜMÜ — yalnız önizleme. clipPath içeriği karmaşık (alt şekiller
 * kombinasyonu) olduğundan bu turda düzenleyici yok; panel otomatik olarak
 * "düzenleyici yok" ipucu gösterir. Önizleme: kaynağı `clip-path="url(#id)"` ile
 * kullanan küçük bir kare — kaynak modelden gelir, değişince canlı güncellenir (İlke 3).
 */
kaynakGorunumKaydet({
  turId: 'clipPath',
  onizleme: (belge, id) =>
    defsOnizleme(belge, id, `<rect width="30" height="18" fill="#7aa7e6" clip-path="url(#${id})"/>`),
});
