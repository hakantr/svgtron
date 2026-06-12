import { app } from "electron";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Dil dosyası bakım servisi (TK-28) — `tr.dil` tek doğruluk kaynağıdır (AGENTS.md §3).
 *
 * Tr harici bir dil seçilince renderer, o dilde EKSİK olan anahtarları hesaplar ve
 * buraya yollar; biz onları `anahtar = ?` olarak ilgili `<kod>.dil` KAYNAK dosyasına
 * ekleriz. Böylece geliştirici, dosyada `= ?` arayarak hangi anahtarın henüz
 * çevrilmediğini görür.
 *
 * Yalnız GELİŞTİRMEDE çalışır: kaynak `.dil` dosyaları diskte (proje ağacında) varsa.
 * Üretimde (asar paketi) dosya bulunmaz → sessizce no-op. Güvenlik: dil kodu ve
 * anahtarlar sıkı doğrulanır (yol gezme / içerik enjeksiyonu engellenir); değer
 * her zaman sabit `?`'dir.
 */

/** Geçerli dil kodu (yol gezmeyi engeller; tr hariç tutulur ayrıca). */
const DIL_KOD_RE = /^[a-z]{2,8}$/;
/** Geçerli i18n anahtarı (yeni satır / `=` / boşluk içeremez → enjeksiyon yok). */
const ANAHTAR_RE = /^[\w.-]+$/;

/** Kaynak `.dil` dosyasındaki mevcut anahtarları toplar. */
function mevcutAnahtarlar(icerik: string): Set<string> {
  const kume = new Set<string>();
  for (const ham of icerik.split(/\r?\n/)) {
    const satir = ham.trim();
    if (!satir || satir.startsWith("#")) continue;
    const esit = satir.indexOf("=");
    if (esit > 0) kume.add(satir.slice(0, esit).trim());
  }
  return kume;
}

/**
 * `<kod>.dil` kaynağını, verilen eksik anahtarları `anahtar = ?` olarak ekleyerek
 * günceller. tr (kaynak) senkronlanmaz. Yalnız dosya diskte varsa (geliştirme).
 * @returns Gerçekten eklenen anahtar sayısı (0 = dosya yok / hepsi zaten var / hata).
 */
export async function dilDosyasiniSenkronla(
  kod: string,
  eksikAnahtarlar: string[],
): Promise<number> {
  if (typeof kod !== "string" || !DIL_KOD_RE.test(kod) || kod === "tr")
    return 0;
  if (!Array.isArray(eksikAnahtarlar) || eksikAnahtarlar.length === 0) return 0;
  const yol = join(app.getAppPath(), "src", "renderer", "diller", `${kod}.dil`);
  if (!existsSync(yol)) return 0; // kaynak yalnız geliştirmede var (üretimde no-op)

  try {
    const icerik = await readFile(yol, "utf-8");
    const mevcut = mevcutAnahtarlar(icerik);
    // Yalnız geçerli ve gerçekten eksik anahtarlar (idempotent + güvenli).
    const eklenecek = [...new Set(eksikAnahtarlar)].filter(
      (a) => typeof a === "string" && ANAHTAR_RE.test(a) && !mevcut.has(a),
    );
    if (eklenecek.length === 0) return 0;

    const oncesi = icerik.endsWith("\n") ? icerik : icerik + "\n";
    const blok =
      "\n# Otomatik eklendi — çevrilmedi (TK-28). Çeviriyi yazıp '?' işaretini kaldırın.\n" +
      eklenecek.map((a) => `${a} = ?`).join("\n") +
      "\n";
    await writeFile(yol, oncesi + blok, "utf-8");
    return eklenecek.length;
  } catch {
    return 0; // okunamadı/yazılamadı → sessiz (bakım özelliği, akışı bozma)
  }
}
