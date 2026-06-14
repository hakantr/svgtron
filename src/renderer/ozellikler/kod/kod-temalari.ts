import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { tags as t } from "@lezer/highlight";

/**
 * Kod paneli söz-dizimi renklendirme temaları (TK-39/CodeMirror — kullanıcı
 * isteği: "SVG KODU" barının sağında bilindik 10 renklendirme tercihi).
 *
 * Her tema; editör zemini/metni/imleci/seçimi (EditorView.theme) + söz-dizimi
 * paletini (HighlightStyle) tek bir Extension olarak verir. Panel bunu bir
 * `Compartment` ile dinamik değiştirir (editörü yeniden kurmadan). Renklendirme
 * görünüm durumudur (İlke 9 → undo'ya girmez; localStorage'da korunur).
 *
 * NOT: Önceki kurulum `defaultHighlightStyle`'ı tema gradient zemini üstünde
 * kullanıyordu (göz yorucu). Bu temalar kendi solid zeminleri + dengeli
 * paletleriyle bunu giderir.
 */
export interface KodTema {
  id: string;
  etiket: string;
  karanlik: boolean;
  zemin: string;
  metin: string;
  imlec: string;
  secim: string;
  gutterMetin: string;
  /** söz-dizimi renkleri */
  yorum: string;
  anahtar: string;
  dize: string;
  sayi: string;
  etiketAdi: string; // <tagName>
  oznitelik: string; // attributeName
  operator: string; // operatör/işaretçi
}

/** Bilindik 10 renklendirme (8 koyu + 2 açık). */
export const kodTemalari: KodTema[] = [
  {
    id: "one-dark",
    etiket: "One Dark",
    karanlik: true,
    zemin: "#282c34",
    metin: "#abb2bf",
    imlec: "#528bff",
    secim: "#3e4451",
    gutterMetin: "#5c6370",
    yorum: "#5c6370",
    anahtar: "#c678dd",
    dize: "#98c379",
    sayi: "#d19a66",
    etiketAdi: "#e06c75",
    oznitelik: "#d19a66",
    operator: "#56b6c2",
  },
  {
    id: "dracula",
    etiket: "Dracula",
    karanlik: true,
    zemin: "#282a36",
    metin: "#f8f8f2",
    imlec: "#f8f8f0",
    secim: "#44475a",
    gutterMetin: "#6272a4",
    yorum: "#6272a4",
    anahtar: "#ff79c6",
    dize: "#f1fa8c",
    sayi: "#bd93f9",
    etiketAdi: "#ff79c6",
    oznitelik: "#50fa7b",
    operator: "#ff79c6",
  },
  {
    id: "monokai",
    etiket: "Monokai",
    karanlik: true,
    zemin: "#272822",
    metin: "#f8f8f2",
    imlec: "#f8f8f0",
    secim: "#49483e",
    gutterMetin: "#75715e",
    yorum: "#75715e",
    anahtar: "#f92672",
    dize: "#e6db74",
    sayi: "#ae81ff",
    etiketAdi: "#f92672",
    oznitelik: "#a6e22e",
    operator: "#f92672",
  },
  {
    id: "solarized-dark",
    etiket: "Solarized Dark",
    karanlik: true,
    zemin: "#002b36",
    metin: "#839496",
    imlec: "#839496",
    secim: "#073642",
    gutterMetin: "#586e75",
    yorum: "#586e75",
    anahtar: "#859900",
    dize: "#2aa198",
    sayi: "#d33682",
    etiketAdi: "#268bd2",
    oznitelik: "#b58900",
    operator: "#859900",
  },
  {
    id: "nord",
    etiket: "Nord",
    karanlik: true,
    zemin: "#2e3440",
    metin: "#d8dee9",
    imlec: "#d8dee9",
    secim: "#434c5e",
    gutterMetin: "#616e88",
    yorum: "#616e88",
    anahtar: "#81a1c1",
    dize: "#a3be8c",
    sayi: "#b48ead",
    etiketAdi: "#81a1c1",
    oznitelik: "#8fbcbb",
    operator: "#81a1c1",
  },
  {
    id: "gruvbox-dark",
    etiket: "Gruvbox Dark",
    karanlik: true,
    zemin: "#282828",
    metin: "#ebdbb2",
    imlec: "#ebdbb2",
    secim: "#3c3836",
    gutterMetin: "#928374",
    yorum: "#928374",
    anahtar: "#fb4934",
    dize: "#b8bb26",
    sayi: "#d3869b",
    etiketAdi: "#8ec07c",
    oznitelik: "#fabd2f",
    operator: "#fe8019",
  },
  {
    id: "tomorrow-night",
    etiket: "Tomorrow Night",
    karanlik: true,
    zemin: "#1d1f21",
    metin: "#c5c8c6",
    imlec: "#c5c8c6",
    secim: "#373b41",
    gutterMetin: "#969896",
    yorum: "#969896",
    anahtar: "#b294bb",
    dize: "#b5bd68",
    sayi: "#de935f",
    etiketAdi: "#cc6666",
    oznitelik: "#f0c674",
    operator: "#8abeb7",
  },
  {
    id: "vscode-dark",
    etiket: "VS Code Dark+",
    karanlik: true,
    zemin: "#1e1e1e",
    metin: "#d4d4d4",
    imlec: "#aeafad",
    secim: "#264f78",
    gutterMetin: "#858585",
    yorum: "#6a9955",
    anahtar: "#569cd6",
    dize: "#ce9178",
    sayi: "#b5cea8",
    etiketAdi: "#569cd6",
    oznitelik: "#9cdcfe",
    operator: "#d4d4d4",
  },
  {
    id: "solarized-light",
    etiket: "Solarized Light",
    karanlik: false,
    zemin: "#fdf6e3",
    metin: "#657b83",
    imlec: "#657b83",
    secim: "#eee8d5",
    gutterMetin: "#93a1a1",
    yorum: "#93a1a1",
    anahtar: "#859900",
    dize: "#2aa198",
    sayi: "#d33682",
    etiketAdi: "#268bd2",
    oznitelik: "#b58900",
    operator: "#859900",
  },
  {
    id: "github-light",
    etiket: "GitHub Light",
    karanlik: false,
    zemin: "#ffffff",
    metin: "#24292e",
    imlec: "#044289",
    secim: "#c8e1ff",
    gutterMetin: "#6a737d",
    yorum: "#6a737d",
    anahtar: "#d73a49",
    dize: "#032f62",
    sayi: "#005cc5",
    etiketAdi: "#22863a",
    oznitelik: "#6f42c1",
    operator: "#d73a49",
  },
];

export const VARSAYILAN_KOD_TEMA = "one-dark";

/** Bir tema id'sinin CodeMirror eklenti dizisini üretir (editör teması + söz-dizimi). */
export function kodTemaUzanti(id: string): Extension {
  const tema = kodTemalari.find((x) => x.id === id) ?? kodTemalari[0]!;
  const editorTemasi = EditorView.theme(
    {
      "&": { color: tema.metin, backgroundColor: tema.zemin },
      ".cm-content": { caretColor: tema.imlec },
      ".cm-cursor, .cm-dropCursor": { borderLeftColor: tema.imlec },
      ".cm-gutters": {
        backgroundColor: tema.zemin,
        color: tema.gutterMetin,
        border: "none",
      },
      ".cm-activeLineGutter": { backgroundColor: "transparent" },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
        backgroundColor: tema.secim,
      },
    },
    { dark: tema.karanlik },
  );
  const renklendirme = HighlightStyle.define([
    { tag: [t.comment, t.lineComment, t.blockComment], color: tema.yorum, fontStyle: "italic" },
    { tag: [t.keyword, t.modifier, t.operatorKeyword, t.self], color: tema.anahtar },
    { tag: [t.string, t.special(t.string), t.attributeValue], color: tema.dize },
    { tag: [t.number, t.bool, t.atom, t.literal], color: tema.sayi },
    { tag: [t.tagName, t.heading], color: tema.etiketAdi },
    { tag: [t.attributeName, t.propertyName], color: tema.oznitelik },
    {
      tag: [t.operator, t.punctuation, t.separator, t.angleBracket, t.bracket],
      color: tema.operator,
    },
    { tag: [t.meta, t.documentMeta, t.processingInstruction], color: tema.yorum },
    { tag: [t.variableName, t.typeName, t.className], color: tema.metin },
    { tag: [t.link, t.url], color: tema.dize, textDecoration: "underline" },
  ]);
  return [editorTemasi, syntaxHighlighting(renklendirme)];
}
