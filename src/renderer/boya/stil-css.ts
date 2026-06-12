import { parse, generate, type CssNode, type Rule } from "css-tree";

/**
 * `<style>` metni içinde tek bir kuralın bir özelliğini okuyan/yazan saf
 * yardımcılar (DOM'a bağlı değil). CSS yazım modunun (TK-18) "nesne başına sınıf"
 * stratejisi bunları kullanır.
 *
 * **TK-39 (css-tree):** Eskiden regex tabanlıydı ve dosyanın kendisi "yalnız basit
 * sınıf kuralı, iç-brace yok" sınırını koyuyordu; `@media`/`@keyframes` içine gömülü
 * bir kuralı YANLIŞLIKLA hedefleyebiliyor, bildirim değeri `{`/`}` içerirse ya da
 * gruplu seçici varsa kırılabiliyordu. Artık `css-tree` ile **gerçek AST** üzerinden
 * çalışır:
 *  - Yalnız ÜST DÜZEY kurallar taranır → `@media`/`@keyframes` içindeki aynı-adlı
 *    kurallar (alt düğümler) asla yanlışlıkla düzenlenmez.
 *  - Düzenleme, hedef kuralın metin aralığı (konum bilgisiyle) yerinde değiştirilir;
 *    kuralın DIŞINDAKİ her şey (yorumlar, @-kurallar, biçimlendirme) **bayt-bayt
 *    korunur**.
 *  - Ayrıştırılamayan CSS'e dokunulmaz (İlke 8 — kabul ederken esnek).
 */

/** Bir üst düzey kuralın bildirimlerini ad→{deger, önemli} olarak toplar (sıra korunur). */
function bildirimleriTopla(
  kural: Rule,
): Map<string, { deger: string; onemli: boolean }> {
  const harita = new Map<string, { deger: string; onemli: boolean }>();
  for (const c of kural.block.children.toArray()) {
    if (c.type !== "Declaration") continue;
    harita.set(c.property, {
      deger: generate(c.value),
      onemli: c.important !== false,
    });
  }
  return harita;
}

/** Kuralın seçici metni (normalize). */
function seciciMetni(kural: Rule): string {
  try {
    return generate(kural.prelude).trim();
  } catch {
    return "";
  }
}

/** Kuralın özgün seçici metni (konumdan; gruplu/aralıklı seçici aynen korunur). */
function seciciHam(styleMetni: string, kural: Rule): string {
  const loc = kural.prelude.loc;
  if (loc) return styleMetni.slice(loc.start.offset, loc.end.offset).trim();
  return seciciMetni(kural);
}

/** Belgeyi ayrıştırıp ÜST DÜZEY kuralları (Atrule içindekiler hariç) verir. */
function ustDuzeyKurallar(styleMetni: string, konum: boolean): Rule[] {
  let ast: CssNode;
  try {
    ast = parse(styleMetni, konum ? { positions: true } : undefined);
  } catch {
    return [];
  }
  if (ast.type !== "StyleSheet") return [];
  return ast.children.toArray().filter((n): n is Rule => n.type === "Rule");
}

/**
 * `<style>` metnindeki `selector` kuralının `ozellik`'ini ayarlar/siler ve yeni
 * metni döndürür. Kural yoksa ve değer doluysa metin sonuna eklenir. Boş değer
 * özelliği siler; sonuçta kural boş kalsa bile (zararsız) bırakılır.
 */
export function cssKuralYaz(
  styleMetni: string,
  selector: string,
  ozellik: string,
  deger: string,
): string {
  const hedef = deger.trim();
  const sel = selector.trim();
  for (const kural of ustDuzeyKurallar(styleMetni, true)) {
    if (seciciMetni(kural) !== sel) continue;
    const loc = kural.loc;
    if (!loc) break; // konum yoksa yerinde değiştiremeyiz → sona ekleme yoluna düş
    const harita = bildirimleriTopla(kural);
    if (hedef === "") harita.delete(ozellik);
    else harita.set(ozellik, { deger: hedef, onemli: false });
    const govde = [...harita]
      .map(([k, v]) => `${k}: ${v.deger}${v.onemli ? " !important" : ""}`)
      .join("; ");
    const hamSel = seciciHam(styleMetni, kural);
    const yeniKural = govde ? `${hamSel} { ${govde} }` : `${hamSel} { }`;
    return (
      styleMetni.slice(0, loc.start.offset) +
      yeniKural +
      styleMetni.slice(loc.end.offset)
    );
  }
  // Kural yok: değer doluysa sona ekle (önceki davranış korunur).
  if (hedef === "") return styleMetni;
  const yeniKural = `${sel} { ${ozellik}: ${hedef} }`;
  return styleMetni.trim()
    ? `${styleMetni.replace(/\s+$/, "")}\n${yeniKural}\n`
    : `\n${yeniKural}\n`;
}

/** `<style>` metnindeki bir kuralın bir özelliğinin değeri (yoksa null). */
export function cssKuralOku(
  styleMetni: string,
  selector: string,
  ozellik: string,
): string | null {
  const sel = selector.trim();
  for (const kural of ustDuzeyKurallar(styleMetni, false)) {
    if (seciciMetni(kural) !== sel) continue;
    return bildirimleriTopla(kural).get(ozellik)?.deger ?? null;
  }
  return null;
}
