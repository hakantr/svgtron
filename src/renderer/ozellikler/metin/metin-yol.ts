import { dugumOlustur, type Dugum } from "../../../cekirdek/belge/model/dugum";

/**
 * Metin↔yol (textPath) saf dönüşümleri (TK-37 #6) — DOM/dil/menü bağımsız, böylece
 * birim testlenebilir. Wiring (`metin-eylemleri.ts`) bunları Command'a sarar (İlke 2).
 */

/** Derin kopya (id dâhil; içerik canlı ağaçta tek örnek olduğundan güvenli). */
function derinKopya(d: Dugum): Dugum {
  return dugumOlustur(
    d.etiket,
    new Map(d.oznitelikler),
    d.cocuklar.map(derinKopya),
    d.metin,
  );
}

/**
 * Bir `<text>`'in içeriğini `<textPath href="#pathId">` içine sarıp YENİ bir
 * `<text>` döndürür (öznitelikler korunur, içerik textPath'e KOPYALANIR → özgün
 * text dokunulmaz, undo güvenli).
 */
export function metniYolaSar(text: Dugum, pathId: string): Dugum {
  const textPath = dugumOlustur(
    "textPath",
    new Map([["href", `#${pathId}`]]),
    text.cocuklar.map(derinKopya),
    text.metin,
  );
  return dugumOlustur("text", new Map(text.oznitelikler), [textPath]);
}

/**
 * Bir `<text>`'in (tek `<textPath>` çocuğu varsa) içeriğini textPath'ten çıkarıp
 * doğrudan text'e koyar; textPath yoksa null.
 */
export function metniYoldanCoz(text: Dugum): Dugum | null {
  if (text.cocuklar.length !== 1 || text.cocuklar[0]!.etiket !== "textPath")
    return null;
  const tp = text.cocuklar[0]!;
  return dugumOlustur(
    "text",
    new Map(text.oznitelikler),
    tp.cocuklar.map(derinKopya),
    tp.metin,
  );
}
