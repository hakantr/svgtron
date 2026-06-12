import { html, nothing, type TemplateResult } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import type { Belge } from '../../../cekirdek/belge/belge';
import { gez, type Dugum } from '../../../cekirdek/belge/model/dugum';
import { dugumSerile } from '../../../cekirdek/belge/model/disa-aktar';
import type { Komut } from '../../../cekirdek/komutlar/komut';

/**
 * Kaynak GÖRÜNÜMÜ (renderer) — çekirdek `KaynakTuru` sözleşmesinin (veri/komut)
 * GÖRSEL tamamlayıcısı. Önizleme ve düzenleyici lit şablonu döndürdüğünden bunlar
 * çekirdeğe konmaz (İlke 1: çekirdek framework'ten habersiz); ayrı bir renderer
 * kaydında tutulur. Her tür dosyası kendi görünümünü buraya da kaydeder (İlke 5).
 *
 * Böylece Tanımlar paneli (§8.1) listede kaynağın küçük önizlemesini gösterir ve bir
 * kaynağa tıklanınca altında düzenleyicisini açar — "oluştur"un ötesinde tasarla/değiştir.
 */

/** Düzenleyiciye verilen bağlam. */
export interface KaynakDuzenleBaglami {
  readonly belge: Belge;
  /** Düzenlenen kaynağın SVG id'si (ya da stil sınıf adı). */
  readonly kaynakId: string;
  /** Bir komutu geçmiş üzerinden çalıştırır (İlke 2 — geri-alınabilir). */
  komut(k: Komut): void;
  /** Paneli yeniden çizer (yerel UI durumu değişince). */
  tazele(): void;
}

/** Bir kaynak türünün görsel yüzü (önizleme + düzenleyici). */
export interface KaynakGorunum {
  /** Çekirdek `KaynakTuru.id` ile eşleşen tür kimliği. */
  readonly turId: string;
  /** Listede bir kaynağın küçük önizlemesi. */
  onizleme?(belge: Belge, kaynakId: string): TemplateResult | typeof nothing;
  /** Seçili kaynağı düzenleyen alanlar (komutla yazar). */
  duzenle?(baglam: KaynakDuzenleBaglami): TemplateResult | typeof nothing;
}

const harita = new Map<string, KaynakGorunum>();

/** Bir tür görünümünü kaydeder (tür dosyasından, İlke 5). */
export function kaynakGorunumKaydet(gorunum: KaynakGorunum): void {
  harita.set(gorunum.turId, gorunum);
}

/** Tür kimliğine göre görünümü döndürür (yoksa undefined). */
export function kaynakGorunumAl(turId: string): KaynakGorunum | undefined {
  return harita.get(turId);
}

/** Belgede SVG id'sine göre düğümü bulur (gradient/marker/filter… defs içinde). */
export function kaynakDugumBul(belge: Belge, id: string): Dugum | null {
  for (const d of gez(belge.kok)) if (d.oznitelikler.get('id') === id) return d;
  return null;
}

/**
 * GENEL önizleme yardımcısı: kaynağı küçük bir `<svg><defs>` içine serileştirir ve
 * `ornek` (url(#id) ile kaynağı kullanan SVG parçası) ile gösterir. Kaynak modelden
 * gelir (içe aktarımda script/on* ayıklanmıştır → unsafeHTML güvenli). Kaynak yoksa boş.
 */
export function defsOnizleme(
  belge: Belge,
  id: string,
  ornek: string,
  w = 30,
  h = 18,
): TemplateResult | typeof nothing {
  const dugum = kaynakDugumBul(belge, id);
  if (!dugum) return nothing;
  return onizlemeSvg(`<defs>${dugumSerile(dugum)}</defs>${ornek}`, w, h);
}

/**
 * Ham SVG iç-içeriğini küçük bir önizleme `<svg>`'sine sarar (defs olmayan kaynaklar
 * — örn. stil sınıfı: `<style>` + örnek şekil). İçerik modelden gelir (sanitize
 * edilmiş) → unsafeHTML güvenli. `<svg>` %100 boyut → panel kutusunu doldurur.
 */
export function onizlemeSvg(icerik: string, w = 30, h = 18): TemplateResult {
  const svgMetin =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">` +
    `${icerik}</svg>`;
  return html`${unsafeHTML(svgMetin)}`;
}
