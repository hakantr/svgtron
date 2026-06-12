import {
  temaKayitDefteri,
  type Tema,
} from '../../../cekirdek/registry/tema-registry';

/**
 * Yerleşik temalar.
 *
 * Hepsi lisans sorunu olmayan (MIT / serbest) paletlerdir; renk değerleri
 * aşağıda ilgili kaynağa atıfla kullanılmıştır. Ayrıntılı atıf için bkz.
 * proje kökündeki LISANSLAR.md.
 *
 * Yeni tema eklemek = bu listeye bir nesne eklemek (ya da ayrı bir dosyadan
 * `temaKayitDefteri.kaydet(...)` çağırmak). Kabuk değişmez (İlke 5).
 */
const TEMALAR: readonly Tema[] = [
  // ——— Metal: özgün, modern metalik koyu arayüz (VARSAYILAN) ———
  {
    id: 'metal',
    etiket: 'Metal',
    tur: 'koyu',
    degiskenler: {
      '--zemin': 'linear-gradient(160deg, #1b1d22 0%, #121316 100%)',
      '--yuzey': 'linear-gradient(180deg, #34373d 0%, #25272c 100%)',
      '--yuzey-2': 'linear-gradient(180deg, #2c2f34 0%, #212327 100%)',
      '--yuzey-hover': '#3a3e45',
      '--kenarlik': 'rgba(0, 0, 0, 0.55)',
      '--metin': '#e8eaed',
      '--metin-soluk': '#9aa0a8',
      '--vurgu': 'linear-gradient(180deg, #4a90e2 0%, #2f6fc0 100%)',
      '--vurgu-hover': 'linear-gradient(180deg, #5b9ce8 0%, #3a7ad0 100%)',
      '--vurgu-metin': '#ffffff',
      '--hata': '#f48771',
      '--tuval-1': '#2a2d31',
      '--tuval-2': '#222427',
    },
  },

  // ——— Koyu: sade düz koyu ———
  {
    id: 'koyu',
    etiket: 'Koyu',
    tur: 'koyu',
    degiskenler: {
      '--zemin': '#1e1e1e',
      '--yuzey': '#252526',
      '--yuzey-2': '#2d2d2d',
      '--yuzey-hover': '#2a2a2a',
      '--kenarlik': '#333333',
      '--metin': '#e6e6e6',
      '--metin-soluk': '#9a9a9a',
      '--vurgu': '#0e639c',
      '--vurgu-hover': '#1177bb',
      '--vurgu-metin': '#ffffff',
      '--hata': '#f48771',
      '--tuval-1': '#2a2a2a',
      '--tuval-2': '#262626',
    },
  },

  // ——— Açık: sade düz açık ———
  {
    id: 'acik',
    etiket: 'Açık',
    tur: 'acik',
    degiskenler: {
      '--zemin': '#f3f3f3',
      '--yuzey': '#ffffff',
      '--yuzey-2': '#eaeaea',
      '--yuzey-hover': '#e0e0e0',
      '--kenarlik': '#d0d0d0',
      '--metin': '#1f1f1f',
      '--metin-soluk': '#6a6a6a',
      '--vurgu': '#0a6cc4',
      '--vurgu-hover': '#0b7be0',
      '--vurgu-metin': '#ffffff',
      '--hata': '#c4321a',
      '--tuval-1': '#e8e8e8',
      '--tuval-2': '#f4f4f4',
    },
  },

  // ——— Nord (MIT, arcticicestudio/nord) ———
  {
    id: 'nord',
    etiket: 'Nord',
    tur: 'koyu',
    degiskenler: {
      '--zemin': '#2e3440',
      '--yuzey': '#3b4252',
      '--yuzey-2': '#434c5e',
      '--yuzey-hover': '#4c566a',
      '--kenarlik': '#2b303b',
      '--metin': '#eceff4',
      '--metin-soluk': '#9aa3b2',
      '--vurgu': '#5e81ac',
      '--vurgu-hover': '#81a1c1',
      '--vurgu-metin': '#eceff4',
      '--hata': '#bf616a',
      '--tuval-1': '#353b49',
      '--tuval-2': '#2e3440',
    },
  },

  // ——— Dracula (MIT, dracula/dracula-theme) ———
  {
    id: 'dracula',
    etiket: 'Dracula',
    tur: 'koyu',
    degiskenler: {
      '--zemin': '#282a36',
      '--yuzey': '#21222c',
      '--yuzey-2': '#343746',
      '--yuzey-hover': '#44475a',
      '--kenarlik': '#191a21',
      '--metin': '#f8f8f2',
      '--metin-soluk': '#6272a4',
      '--vurgu': '#bd93f9',
      '--vurgu-hover': '#caa6fa',
      '--vurgu-metin': '#282a36',
      '--hata': '#ff5555',
      '--tuval-1': '#2f3140',
      '--tuval-2': '#282a36',
    },
  },

  // ——— Solarized Koyu (MIT, Ethan Schoonover) ———
  {
    id: 'solarized-koyu',
    etiket: 'Solarized Koyu',
    tur: 'koyu',
    degiskenler: {
      '--zemin': '#002b36',
      '--yuzey': '#073642',
      '--yuzey-2': '#0a4150',
      '--yuzey-hover': '#0e4b5a',
      '--kenarlik': '#00212b',
      '--metin': '#93a1a1',
      '--metin-soluk': '#586e75',
      '--vurgu': '#268bd2',
      '--vurgu-hover': '#3a9bdf',
      '--vurgu-metin': '#fdf6e3',
      '--hata': '#dc322f',
      '--tuval-1': '#073642',
      '--tuval-2': '#002b36',
    },
  },

  // ——— Solarized Açık (MIT, Ethan Schoonover) ———
  {
    id: 'solarized-acik',
    etiket: 'Solarized Açık',
    tur: 'acik',
    degiskenler: {
      '--zemin': '#fdf6e3',
      '--yuzey': '#eee8d5',
      '--yuzey-2': '#e3ddca',
      '--yuzey-hover': '#d9d2bd',
      '--kenarlik': '#ddd6c1',
      '--metin': '#657b83',
      '--metin-soluk': '#93a1a1',
      '--vurgu': '#268bd2',
      '--vurgu-hover': '#3a9bdf',
      '--vurgu-metin': '#fdf6e3',
      '--hata': '#dc322f',
      '--tuval-1': '#eee8d5',
      '--tuval-2': '#fdf6e3',
    },
  },

  // ——— Gruvbox Koyu (MIT, morhetz/gruvbox) ———
  {
    id: 'gruvbox-koyu',
    etiket: 'Gruvbox Koyu',
    tur: 'koyu',
    degiskenler: {
      '--zemin': '#282828',
      '--yuzey': '#3c3836',
      '--yuzey-2': '#504945',
      '--yuzey-hover': '#665c54',
      '--kenarlik': '#1d2021',
      '--metin': '#ebdbb2',
      '--metin-soluk': '#a89984',
      '--vurgu': '#d65d0e',
      '--vurgu-hover': '#fe8019',
      '--vurgu-metin': '#282828',
      '--hata': '#fb4934',
      '--tuval-1': '#32302f',
      '--tuval-2': '#282828',
    },
  },
];

for (const tema of TEMALAR) {
  temaKayitDefteri.kaydet(tema);
}

/** Uygulama ilk açılışta bu temayı kullanır. */
export const VARSAYILAN_TEMA_ID = 'metal';
