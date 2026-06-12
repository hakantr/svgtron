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
 * mask (maske) kaynak türü (CLAUDE.md Faz G+, §8.1, §10.6). Uygulama stratejisi
 * `mask="url(#id)"`. Listele · uygula · oluştur (dairesel maske: beyaz=görünür) · sil.
 */

function defsBul(belge: Belge): Dugum | null {
  return belge.kok.cocuklar.find((d) => d.etiket === 'defs') ?? null;
}
function maskeDugumu(belge: Belge, id: string): Dugum | null {
  for (const d of gez(belge.kok)) if (d.etiket === 'mask' && d.oznitelikler.get('id') === id) return d;
  return null;
}

kaynakTuruKayitDefteri.kaydet({
  id: 'mask',
  etiket: 'Maskeler (mask)',

  listele(belge) {
    const ogeler: { id: string; etiket: string }[] = [];
    for (const d of gez(belge.kok)) {
      const id = d.oznitelikler.get('id');
      if (d.etiket === 'mask' && id) ogeler.push({ id, etiket: id });
    }
    return ogeler;
  },

  uygula(belge, dugumler, kaynakId): Komut | null {
    if (dugumler.length === 0) return null;
    return new BilesikKomut(
      'maske uygula',
      dugumler.map((d) => stilUygulaKomutu(belge, d, 'mask', `url(#${kaynakId})`)),
    );
  },

  olustur(belge): Komut {
    const komutlar: Komut[] = [];
    let defs = defsBul(belge);
    if (!defs) {
      defs = dugumOlustur('defs');
      komutlar.push(new DugumEkleKomutu(belge, belge.kok, defs, 0));
    }
    const id = benzersizId(belge.kok, 'svgtron-maske-');
    // Maskede beyaz=görünür, siyah=gizli. Dairesel görünür alan (vignette başlangıcı).
    const maske = dugumOlustur('mask', { id }, [
      dugumOlustur('rect', { x: '0', y: '0', width: '100', height: '100', fill: 'black' }),
      dugumOlustur('circle', { cx: '50', cy: '50', r: '45', fill: 'white' }),
    ]);
    komutlar.push(new DugumEkleKomutu(belge, defs, maske));
    return new BilesikKomut('maske oluştur', komutlar);
  },

  sil(belge, kaynakId): Komut | null {
    const defs = defsBul(belge);
    const maske = maskeDugumu(belge, kaynakId);
    if (!defs || !maske || !defs.cocuklar.includes(maske)) return null;
    return new DugumCikarKomutu(belge, defs, maske);
  },
});

/**
 * Maske GÖRÜNÜMÜ (yalnız önizleme — §8.1). Maske içeriği karmaşık (rect/circle +
 * beyaz=görünür kuralı) olduğundan bu turda düzenleyici eklenmez; önizleme,
 * maske uygulanmış küçük bir kareyle kaynağın etkisini gösterir.
 */
kaynakGorunumKaydet({
  turId: 'mask',
  onizleme: (belge, id) =>
    defsOnizleme(belge, id, `<rect width="30" height="18" fill="#7aa7e6" mask="url(#${id})"/>`),
});
