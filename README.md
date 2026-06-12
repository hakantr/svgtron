# SVG Editör & Animasyon Gözlemleyici (`svgtron`)

SVG dosyalarını **tam sadakatle** görüntüleyen, animasyonlarını (SMIL + CSS/WAAPI)
oynatıp kontrol eden ve düzenlenmesine imkân veren, **Electron** tabanlı bir
masaüstü editörü.

> **Neden Electron?** Chromium her platforma (macOS / Linux / Windows) uygulamayla
> birlikte paketlendiği için SVG render motoru her yerde **aynıdır**. Bir
> platformda doğru görünen animasyon diğerinde de birebir aynı görünür — sistem
> webview'ı kullanan çözümlerin aksine render tutarsızlığı yaşanmaz.

Proje dili **Türkçe**'dir (kod yorumları, modül adları ve arayüz). Arayüz çok
dillidir; yeni diller dosya eklenerek gelir (bkz. [Diller](#diller-i18n)).

---

## İçindekiler

- [Özellikler](#özellikler)
- [Teknoloji](#teknoloji)
- [Kurulum ve çalıştırma](#kurulum-ve-çalıştırma)
- [Proje yapısı](#proje-yapısı)
- [Mimari ilkeler](#mimari-ilkeler)
- [Temalar](#temalar)
- [Diller (i18n)](#diller-i18n)
- [Genişletme: yeni özellik eklemek](#genişletme-yeni-özellik-eklemek)
- [Yol haritası](#yol-haritası)
- [Lisans](#lisans)

---

## Özellikler

MVP (dört madde) tamamlandı; UI zemini ve genişleme altyapısı yerinde.

- **SVG aç ve tam render et.** Hamburger menü → *Dosya → Aç…*; seçilen SVG,
  gözlemleyici panelinde damalı zemin üzerinde tam sadakatle çizilir. SMIL/CSS
  animasyonları anında oynar.
- **Animasyon kontrolü.** Alt zaman çizelgesi: oynat / duraklat / başa-sar +
  konum kaydırıcısı (sürükle → seek). Tek bir `Playback` arayüzü arkasında
  (SMIL); UI hangi teknolojinin kullanıldığını bilmez.
- **Seçim + Özellik Denetçisi (türe duyarlı).** Tuvalde şekle tıkla → seçilir
  (çerçeveyle vurgulanır); sağ üstteki denetçi, seçilenin **türüne göre** alan
  setleri gösterir (Görünüm: `fill`/`opacity`; Geometri: şekle göre `x/y/r…`).
- **Sürümden bağımsız belge modeli.** Açılan SVG, ham DOM değil; normalize bir
  soyut modele aktarılır (içe aktarım liberal). Tuval, modeli DOM'a *uyumlayarak*
  yansıtır (animasyon bozulmadan). Dışa aktarım profillidir (Blink tavanı).
- **Undo / Redo.** Her düzenleme bir Command'dir; `Ctrl/Cmd+Z` geri, `Ctrl/Cmd+
  Shift+Z` / `Ctrl+Y` ileri (menüde *Düzen → Geri Al / İleri Al*).
- **Çerçevesiz, modern arayüz.** Platforma uygun özel başlık çubuğu:
  - macOS → yerel pencere kontrolleri (trafik ışıkları) solda,
  - Windows / Linux → özel, temalı kontrol tuşları sağda.
- **Tema desteği.** 8 yerleşik tema; varsayılanı modern metalik **Metal**.
  Seçim hatırlanır. (bkz. [Temalar](#temalar))
- **Çok dillilik.** Varsayılan Türkçe; `.dil` dosyalarıyla yeni dil eklenir.
- **Araçlar + Tuval etkileşimi.** Sol araç çubuğu (Seç / El / Yakınlaştır);
  çoklu seçim + **kement** (değiştirici tuşlarla); **taşıma** ve **boyut/döndürme
  tutamaçları** (sürükle = canlı önizleme, bırak = tek Command); yakınlaştırma/
  kaydırma (tekerlek / orta-fare / Ctrl+0).
- **Katmanlar paneli.** Nesne/grup ağacı, z-sıra (öne/arkaya), görünürlük,
  **kilit** (kalıcılığı İlke 10 yorumlarıyla).
- **Düzenleme.** Sil (Delete), Çoğalt (Ctrl+D), Grupla/Çöz (Ctrl+G / Ctrl+Shift+G).
- **Gelişmiş boya seçici.** Düz renk (SV + ton + **alfa** + hex) ve **gradyan**
  (doğrusal/radyal, N durak) — defs kaynağı olarak; dolgu + kontur.
- **Tanımlar paneli.** İlk kaynak türü **`filter`**: listele / oluştur / seçili
  şekle uygula / sil (kaynak türü deseni — yeni tür = yeni kayıt).
- **Başlık/açıklama** (`<title>`/`<desc>`) düzenleme; **canlı SVG kod paneli**
  (model ⇄ SVG); **Kaydet / Dışa aktar** (profilli — İlke 8/10).

> Henüz **yok**: çizim araçları (kalem/şekil oluşturma), gradyan/marker/stil
> kaynak türleri, yapışma/akıllı kılavuzlar, boole/yol işlemleri, komut paleti.
> Bunlar yol haritasında (§9.2, §11).

---

## Teknoloji

| Alan | Seçim |
| --- | --- |
| Dil | TypeScript (`strict: true`), her üç süreçte |
| Çatı | Electron (ana / preload / renderer) |
| Build | [`electron-vite`](https://electron-vite.org) (tek konfig, hızlı HMR) |
| UI | [Lit](https://lit.dev) (Web Components + reaktif şablon) |
| Güvenlik | `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` |

Renderer'ın tüm yetenekleri preload'daki **dar, tiplenmiş `window.api`** yüzeyinden
geçer; renderer `fs`/`electron`/`ipcRenderer`'a doğrudan erişmez.

---

## Kurulum ve çalıştırma

**Gereksinim:** Node.js 22+.

```bash
npm install        # bağımlılıkları kur
npm run dev        # geliştirme: HMR + Electron penceresi
```

Diğer komutlar:

```bash
npm run build      # üç süreci de out/ altına derle
npm run preview    # üretim derlemesini çalıştır
npm run typecheck  # tsc --noEmit (tip denetimi)
```

Denemek için hazır örnek: `ornekler/ornek-animasyon.svg` (SMIL animasyonu +
`defs`/filter + gradient + `style` sınıfı içerir).

> **Not (Electron ikilisi):** Bazı sınırlandırılmış ortamlarda npm, paketlerin
> `postinstall` adımını engelleyebilir; bu durumda Electron'un ikili dosyası
> indirilmez ve `npm run dev` *"Electron uninstall"* hatası verir. Çözüm:
> ```bash
> node node_modules/electron/install.js
> ```
> Normal bir terminalde `npm install` çalıştırdığınızda bu adım kendiliğinden
> tamamlanır.

---

## Proje yapısı

Özellik-klasörü mantığı: **yeni özellik = yeni klasör + registry'ye kayıt.**

```
src/
  main/                 # Electron ana süreç (Node): pencere, menü, dosya G/Ç
    index.ts            #   yaşam döngüsü + IPC handler'ları
    pencere.ts          #   çerçevesiz pencere + güvenlik modeli
    dosya-servisi.ts    #   fs/dialog YALNIZCA burada
  preload/
    kopru.ts            #   tek tipli window.api yüzeyi (contextBridge)
  ortak/
    api-sozlesmesi.ts   #   IPC kanal/tip sözleşmesi (tek kaynak)
  cekirdek/             # ELECTRON'DAN HABERSİZ çekirdek (web API'leri)
    belge/              #   SVG belge modeli — tek doğruluk kaynağı
      belge.ts          #     model kökü + kimlik indeksi + abone/bildir + disaAktar
      belge-deposu.ts   #     o anki belge + kaynak (dosya) bilgisi
      model/            #     soyut düğüm + içe aktarıcı + dışa aktarıcı (İlke 8)
      tanimlar/         #     <defs>/<style> yapısal modeli + referans indeksi
    komutlar/           #   Command altyapısı + undo/redo geçmişi (İlke 2)
    secim/              #   o an seçili düğümü tutan depo
    animasyon/          #   Playback arayüzü + SMIL oynatma (İlke 6)
    registry/           #   panel / kaynak-türü / tema / menü kayıt defterleri
  renderer/             # UI kabuğu
    kabuk/              #   başlık çubuğu, menü, pencere kontrolleri, tema yön.
    diller/             #   i18n: dil.ts + tr.dil (anahtar=değer)
    tuval/              #   ANA ÇALIŞMA ALANI: yansitici (model→DOM uyumlayıcı) + seçim
    araclar/            #   SOL araç çubuğu (registry'li çizim araçları) — gelecek
    ozellikler/         #   sağ/alt panel bölgeleri; registry'ye kaydolur
      zaman-cizelgesi/  #     ALT: oynat/duraklat/seek (Playback)
      ozellik-denetcisi/#     SAĞ-ÜST seçime duyarlı; turler/ = alan-seti registry'si
      tanimlar-paneli/  #     SAĞ: "Tanımlar ve Ek Özellikler" (defs/style)
      dosya/            #     "Aç…" menü eylemi
      duzen/            #     "Geri Al / İleri Al" menü eylemleri
      temalar/          #     yerleşik tema tanımları
ornekler/               # test SVG'leri
```

---

## Mimari ilkeler

Bu on ilke ilk commit'ten beri yerindedir; sonradan özellik eklerken yeniden
yazımı önler:

1. **Çekirdek Electron'dan habersizdir.** `cekirdek/` yalnızca DOM/SVG/WAAPI
   bilir; Electron'a özgü her şey adapter (preload köprüsü) arkasındadır.
2. **Her düzenleme bir Command'dir** (`uygula`/`geriAl`). DOM'a komut dışında
   doğrudan mutasyon yasaktır → undo/redo, makro, otomasyon "bedava" gelir.
3. **Tek yönlü veri akışı:** `Komut → Belge (tek doğruluk kaynağı) → Görünümler`.
   Görünümler belgeyi okur, asla doğrudan değiştirmez.
4. **Tek tipli IPC sözleşmesi.** Renderer doğrudan `ipcRenderer` çağırmaz; tek,
   tiplenmiş `window.api` vardır. Yeni özellik = sözleşmeye kanal *eklemek*.
5. **Registry ile genişleme.** Araç / panel / dışa-aktarıcı / kaynak-türü /
   tema / menü → kabuk koduna gömülmez, registry'ye kaydolur.
6. **Tek `Playback` arayüzü.** Zaman çizelgesi UI'ı bu arayüzle konuşur; arkada
   SMIL'i (ileride WAAPI'yi) UI bilmeden yönetir.
7. **Kaynaklar yapısaldır + referans indeksi.** `<defs>`/`<style>` ham DOM
   değil, belge modelinde yapısal tutulur; "hangi şekil hangi kaynağı kullanıyor"
   sorusu **O(1)** yanıtlanır (referans indeksi baştan kuruludur).
8. **Belge modeli sürümden bağımsız; içe aktarım liberal, dışa aktarım
   profilli.** İç model ne SVG 1.1 ne SVG 2'dir; soyut, normalize bir temsildir.
   İçe aktarıcı her şeyi kabul edip normalize eder (geriye uyum yalnızca okuma
   için); dışa aktarıcı seçilen profile göre yazar (Blink / geniş uyumluluk).
   Üretim tavanı Blink'in fiilen desteklediği kümedir; kara listedeki yapılar
   (mesh, hatch, SVG-font…) asla üretilmez.
9. **Belge durumu ile görünüm durumu ayrıdır.** Belge durumu (şekiller, konum,
   sıralama, uygulanan tanımlar…) Command'a tabidir ve undo/redo'ya girer.
   Görünüm durumu (yakınlaştırma, menü açık/kapalı, vurgulama, tutamaçlar) belge
   Command'ı üretmez ve undo'ya girmez. Tek istisna **seçim**dir: belgeyi
   değiştirmez ama kendi sınırlı geçmişine girer.
10. **Uygulamanın kendine ait dosya formatı yoktur; tek doğal format SVG'dir.**
    Çıktı her zaman geçerli, taşınabilir SVG'dir. Uygulamaya özgü kontrol bilgisi
    (kilit gibi) ilgili nesnenin üstündeki bir **SVG yorum satırında** saklanır
    (tüm motorlarca yok sayılır); içe aktarımda okunur, dışa aktarımda profile
    göre yazılır/ayıklanır.

---

## Temalar

Tüm renkler CSS değişkeni (tasarım token'ı) üzerinden gelir; token'lar belge
köküne yazılıp Shadow DOM sınırlarını delerek tüm bileşenlere ulaşır. Tema seçimi
başlık çubuğunun sağındadır ve hatırlanır.

Yerleşik temalar:

| Tema | Tür | Kaynak / Lisans |
| --- | --- | --- |
| **Metal** *(varsayılan)* | koyu | özgün |
| Koyu / Açık | koyu / açık | özgün |
| Nord | koyu | MIT |
| Dracula | koyu | MIT |
| Solarized Koyu / Açık | koyu / açık | MIT |
| Gruvbox Koyu | koyu | MIT |

Üçüncü taraf palet atıfları: [`LISANSLAR.md`](./LISANSLAR.md).

**Yeni tema eklemek:** `src/renderer/ozellikler/temalar/temalar.ts` içine token
değerlerini taşıyan bir nesne ekleyip `temaKayitDefteri`'ne kaydetmek yeterli;
kabuk değişmez.

---

## Diller (i18n)

Çeviriler `src/renderer/diller/*.dil` dosyalarında **anahtar = değer**
satırlarıyla tutulur (Java `.properties` / `.lang` tarzı). Varsayılan dil
Türkçe'dir; bir anahtar seçili dilde yoksa Türkçe'ye düşülür.

`tr.dil` örneği:

```properties
dil.ad = Türkçe
menu.dosya.ac = Aç…
durum.surum = Sürüm {surum}
```

**Yeni dil eklemek:** `diller/` altına `en.dil`, `fr.dil`… koyup `tr.dil`'deki
anahtarları çevirmek yeterli. Dosya derlemede otomatik paketlenir; menüdeki
**Dil** bölümünde kendiliğinden görünür. Kod değişmez.

---

## Genişletme: yeni özellik eklemek

Kabuk (shell) hiçbir özelliği bilmez; her şey registry üzerinden eklenir:

- **Panel** → `panelKayitDefteri.kaydet({ id, baslik, bolge, olustur })`
  (bölge: `sol`/`merkez`/`sag`/`alt`)
- **Menü eylemi** → `menuKayitDefteri.kaydet({ id, grup, etiketAnahtari, calistir })`
- **Denetçi alan seti** (türe duyarlı) → `alanSetiKayitDefteri.kaydet({ id, uygunMu, render })`
- **Kaynak türü** (filter/gradient/marker/stil…) → `kaynakTuruKayitDefteri.kaydet(...)`
- **Tema** → `temaKayitDefteri.kaydet(...)`

Özellik dosyası `renderer/index.ts`'te import edildiğinde kendini kaydeder.

---

## Yol haritası

**MVP — tamamlandı** ✅

- **Adım 1 — Dosya aç + tam render.** Dosya servisi + köprü → gözlemleyici.
- **Adım 2 — Seçim + Denetleyici.** Tıkla-seç; `fill`/`opacity`'yi **Command
  ile** değiştir → undo/redo (İlke 2).
- **Adım 3 — Zaman çizelgesi.** `Playback` arayüzü (SMIL) — oynat / duraklat /
  başa-sar + konum kaydırıcısı (İlke 6).

**Editör yetenekleri (eklendi)** ✅ — soyut belge modeli (İlke 8, içe/dışa
aktarım); araç çerçevesi + Seç/El/Yakınlaştır; çoklu seçim + kement; taşıma +
boyut/döndürme tutamaçları; Katmanlar + kilit (İlke 10); gelişmiş boya seçici +
gradyan; sil/çoğalt/grupla/çöz; canlı SVG kod paneli; Kaydet/Dışa aktar.

**Kaynak yönetimi (sırayla):**

- **Faz A** — `<defs>`/`<style>` yapısal zemini + referans indeksi *(kuruldu)*.
- **Faz B** — başlık/metadata (`<title>`/`<desc>`) düzenleme *(eklendi)*.
- **Faz C** — sağ panel + ilk tür **`filter`** (listele/oluştur/uygula/sil) *(eklendi)*.
- **Faz D** — `linearGradient`, `marker` kaynak türleri (gradyan boya seçicide var,
  ayrı tür kaydı sırada).
- **Faz E** — `<style>` / CSS sınıfları.
- **Faz F** — uygulama/atama akışını genelleştir + "kullanıldığı yerler",
  güvenli yeniden adlandırma/silme.
- **Faz G+** — `radialGradient`, `pattern`, `clipPath`, `mask`, `symbol`…

**Sıradaki dalga (§9.2 / §11):** çizim araçları (Kalem / şekiller), yapışma/akıllı
kılavuzlar, boole/yol işlemleri, komut paleti, semboller/bileşenler, seçim geçmişi.

---

## Lisans

[MIT](./LICENSE) © Hakan BİRİŞ

Yerleşik temaların üçüncü taraf palet atıfları için bkz. [`LISANSLAR.md`](./LISANSLAR.md).
