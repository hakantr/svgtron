import {
  menuKayitDefteri,
  type MenuBaglami,
} from "../../../cekirdek/registry/menu-registry";
import { t } from "../../diller/dil";
import { sonDosyalar } from "./son-dosyalar";
import { sekmeYoneticisi } from "../../sekmeler/sekme-yoneticisi";
import { disaAktarSor } from "./disa-aktar-sor";

/**
 * Dosya eylemleri — "Yeni / Aç… / Kaydet / Dışa aktar" menü ögelerini kaydeder
 * (İlke 5, §6). Dosya akışı kabuğa gömülmez; burada yaşar. Köprüden (İlke 4)
 * dosyayı alır, belge deposuna yükler; hata olursa kabuğa bildirir. Belge
 * değişince paneller ve başlık çubuğu kendiliğinden tepki verir (İlke 3).
 */

/**
 * Yeni belge için boş ama GÖRÜNÜR tuval (800×600 beyaz artboard). Şeffaf boş bir
 * svg ekranda görünmez (checkerboard zemin); beyaz zemin "tasarıma hazır" bir
 * tuval verir. Kullanıcı isterse zemini silebilir/değiştirebilir.
 */
const BOS_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">' +
  '<rect width="800" height="600" fill="#ffffff"/></svg>';

/**
 * Belgeyi diske kaydeder (uygulama profili). Kaydedildiyse `true`, kullanıcı
 * kaydetme penceresini iptal ettiyse ya da hata olursa `false` döner. Başarıda
 * deponun "kaydedilmemiş değişiklik" bayrağını sıfırlar.
 */
export async function kaydetBelge(baglam: MenuBaglami): Promise<boolean> {
  const belge = baglam.depo.belge;
  if (!belge) return true;
  try {
    const yol = await window.api.dosyaKaydet(
      belge.disaAktar("blink"),
      baglam.depo.kaynak?.ad ?? "cizim.svg",
    );
    if (!yol) return false; // kullanıcı kaydetme penceresini iptal etti
    baglam.depo.kaydedildi();
    return true;
  } catch {
    baglam.hataBildir(t("dosya.kaydedilemedi"));
    return false;
  }
}

/**
 * İçeriği belge deposuna yükler; eski seçim/geçmişi temizler. Başarı döner.
 *
 * SEKME mantığı (kullanıcı isteği): aktif sekmede halihazırda bir belge VARSA içerik
 * YENİ SEKMEDE açılır (mevcut belge korunur); aktif sekme boşsa oraya yüklenir. Yeni
 * sekme yarattıktan sonra `baglam.depo` (vekil) yeni sekmeye yönlendiğinden `yukle`
 * doğru sekmeye yazar.
 */
function belgeyiKur(
  baglam: MenuBaglami,
  icerik: string,
  kaynak: { ad: string; yol?: string },
): boolean {
  try {
    if (baglam.depo.belge) sekmeYoneticisi.yeniSekme(); // belge varsa yeni sekme
    baglam.depo.yukle(icerik, kaynak);
    baglam.secim.temizle();
    baglam.gecmis.temizle();
    return true;
  } catch {
    baglam.hataBildir(t("dosya.acilamadi"));
    return false;
  }
}

/** "Yeni" — boş tasarıma hazır tuval (sekme mantığıyla: belge varsa yeni sekmede). */
export function yeniBelge(baglam: MenuBaglami): void {
  belgeyiKur(baglam, BOS_SVG, { ad: t("dosya.yeniAd") });
}

/** Son dosyalar listesinden bir yolu açar (kabuk menüsü çağırır; sekme mantığıyla). */
export async function yoldanYukle(
  baglam: MenuBaglami,
  yol: string,
): Promise<void> {
  // Eski/bayat preload build'inde `dosyaYoldanAc` kanalı henüz yoktur (uygulama
  // güncellendi ama çalışan örnek eski) → kanalı YANLIŞLIKLA "dosya yok" sanıp
  // listeden düşürme; bunun yerine kullanıcıya yeniden başlatmayı söyle.
  if (typeof window.api.dosyaYoldanAc !== "function") {
    baglam.hataBildir(t("dosya.yenidenBaslat"));
    return;
  }
  try {
    const dosya = await window.api.dosyaYoldanAc(yol);
    if (!dosya) {
      // Kanal çalıştı ama dosya yok/okunamaz → listeden düş.
      baglam.hataBildir(t("dosya.bulunamadi", { yol }));
      sonDosyalar.cikar(yol);
      return;
    }
    if (belgeyiKur(baglam, dosya.icerik, { ad: dosya.ad, yol: dosya.yol })) {
      sonDosyalar.ekle({ yol: dosya.yol, ad: dosya.ad });
    }
  } catch {
    baglam.hataBildir(t("dosya.acilamadi"));
  }
}

menuKayitDefteri.kaydet({
  id: "dosya.yeni",
  grup: "dosya",
  etiketAnahtari: "menu.dosya.yeni",
  sira: 5,
  calistir: (baglam) => yeniBelge(baglam),
});

menuKayitDefteri.kaydet({
  id: "dosya.ac",
  grup: "dosya",
  etiketAnahtari: "menu.dosya.ac",
  sira: 10,
  calistir: async (baglam) => {
    const dosya = await window.api.dosyaAc();
    if (!dosya) return; // iptal edildi
    if (
      belgeyiKur(baglam, dosya.icerik, { ad: dosya.ad, yol: dosya.yol }) &&
      dosya.yol
    ) {
      sonDosyalar.ekle({ yol: dosya.yol, ad: dosya.ad });
    }
  },
});

/** Kaydet — uygulama profili (İlke 10: editör yorumları dâhil, saf SVG). */
menuKayitDefteri.kaydet({
  id: "dosya.kaydet",
  grup: "dosya",
  etiketAnahtari: "menu.dosya.kaydet",
  sira: 20,
  calistir: async (baglam) => {
    await kaydetBelge(baglam); // kayıt sonrası "değişti" sıfırlanır
  },
});

/**
 * Dışa aktar — profil kullanıcıya sorulur (TK-37 #10): "Uygulama-içi / Blink"
 * (editör yorumları korunur) ya da "Geniş uyumluluk" (editör yorumları ayıklanır).
 * Seçim yalnız dışa-aktarım ayarıdır; doğal kaydetme (İlke 10) "blink" kalır.
 */
menuKayitDefteri.kaydet({
  id: "dosya.disaAktar",
  grup: "dosya",
  etiketAnahtari: "menu.dosya.disaAktar",
  sira: 30,
  calistir: async ({ depo, hataBildir }) => {
    const belge = depo.belge;
    if (!belge) return;
    const profil = await disaAktarSor.sor();
    if (!profil) return; // kullanıcı iptal etti
    const temelAd = (depo.kaynak?.ad ?? "cizim").replace(/\.svg$/i, "");
    // Geniş uyumluluk çıktısı ayrı dosyaya gitsin (kaynağı ezmesin); uygulama-içi
    // çıktı kaydetmeyle aynı profil olduğundan sade ad yeterli.
    const ek = profil === "genis-uyumluluk" ? "-temiz" : "";
    try {
      await window.api.dosyaKaydet(belge.disaAktar(profil), `${temelAd}${ek}.svg`);
    } catch {
      hataBildir(t("dosya.kaydedilemedi"));
    }
  },
});

/** Çıkış — pencereyi kapatmayı dener (kaydedilmemiş değişiklik sorusu akışından geçer). */
menuKayitDefteri.kaydet({
  id: "dosya.cikis",
  grup: "dosya",
  etiketAnahtari: "menu.dosya.cikis",
  sira: 100,
  calistir: () => window.api.pencereKapat(),
});
