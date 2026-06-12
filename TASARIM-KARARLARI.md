# Tasarım Kararları

> Bu dosya, **CLAUDE.md'deki mimari kuralları etkilemez.** Burada uygulamanın
> davranış/etkileşim/görsel tasarımına dair, üzerinde anlaştığımız somut kararlar
> tutulur. İleride "tasarım kararlarımıza uygun mu?" diye denetleme istendiğinde
> ya da yeni bir iş yapıldığında, bu kararlar referans alınır.
>
> Her karar bir kimlik (TK-n), kapsam ve net kabul ölçütleriyle yazılır.

---

## TK-1 — Menü doğal (hover-sürümlü) davranır

**Kapsam:** Üst Çubuk menü modu (§9.5) ve açılan menüler/alt menüler.

**Sorun:** Menü "tıkla-aç" gibi davranıyordu; doğal bir masaüstü menüsü gibi
değildi. Ayrıca açılan menü, üst öğesine bitişik değil, aralıklı (kopuk) duruyordu.

**Karar / kabul ölçütleri:**

1. **Hamburger'a tıklayınca menü modu açılır ve ilk menü (Dosya) zaten açıktır.**
   Yani yalnızca menü çubuğu değil, ilk grubun açılır listesi de görünür.
2. **Üst düzey gruplar arasında geçiş hover ile olur; tıklama gerekmez.** Mouse
   "Düzen" üzerine gelince Dosya kapanır, Düzen açılır. (Tıklama da çalışır.)
3. **Alt menüsü olan öğeler hover ile açılır;** alt-menülü öğeden başka bir öğeye
   geçilince kapanır (kademeli/cascade davranış).
4. **Açılan menü üst öğesine bitişiktir** (boşluk yok).
5. **Bağ, zemin rengiyle DEĞİL, vurgu çizgisiyle kurulur.** Aktif grubun zemin
   rengi değişmez; **aktif grup butonunun altında, BUTON genişliğince** (açılan
   menünün genişliğinde DEĞİL) ince bir vurgu çizgisi belirir — öğenin bittiği
   yer ile açılan menünün başladığı yer arasında durur.
6. **Açılır liste (alt menü) içinde öğe-altı çizgi YOKTUR** (kötü duruyordu);
   üzerine gelinen/klavyeyle odaklanılan öğe yalnızca **hafif zeminle** vurgulanır.
7. **Klavye gezinmesi:** ←/→ üst grupları değiştirir, ↑/↓ öğeleri gezer, **Enter**
   seçer, **Esc** kapatır.
8. **Bir öğe seçilince menü ÖNCE kapanır, sonra eylem çalışır.** Böylece "Aç…"
   gibi async eylemlerde (dosya penceresi açılırken) menü açık kalmaz.
9. **Kapanış:** öğe seçilince, menü dışına tıklanınca veya Esc — toplu moda dönülür.

**Durum ayrımı (İlke 9 ile uyum):** Menünün açık/kapalı olması, hangi alt menünün
açık olduğu — hepsi **görünüm durumudur**; undo'ya girmez, belge modeline
dokunmaz.

---

## TK-2 — Uygulama amblemi (ikon) ve sistemde görünürlük

**Kapsam:** Uygulamanın görsel kimliği; pencere/görev çubuğu/dock ikonu.

**Karar / kabul ölçütleri:**

1. Uygulamanın **özgün bir amblemi** vardır; varsayılan boş ikon kullanılmaz.
2. Amblem, editörün kimliğini yansıtır: **metalik mavi yuvarlatılmış kare zemin**
   üzerinde **vektör "S" eğrisi + kalem düğüm/tutamaçları** (SVG düzenleyici
   motifi; Metal temasıyla uyumlu renkler).
3. Kaynak **`resources/amblem.svg`**; rasterize edilmiş **`resources/amblem.png`**
   (512×512) pencere ikonu olarak kullanılır.
4. **Sistem görünürlüğü:** Windows/Linux(X11)'te `BrowserWindow.icon`, macOS'ta
   `app.dock.setIcon` ile ayarlanır.
5. **Linux/Wayland (GNOME/COSMIC) özel durumu:** Wayland'de pencerelerin ikonu
   pencere özelliğiyle değil, pencerenin **app_id'sinin bir `.desktop` dosyasıyla
   eşleşmesiyle** belirlenir. Bu yüzden: uygulama app_id'si `svgtron` olarak
   sabitlenir (`app.commandLine.appendSwitch('class','svgtron')`), ve eşleşen
   `svgtron.desktop` (Icon=amblem) kullanıcı uygulama dizinine kurulur
   (`resources/dock-ikonu-kur.sh`). Paketlemede bu otomatik yapılacaktır.
6. Amblem değişirse hem SVG hem PNG güncellenir (PNG, SVG'den üretilir).

---

## TK-3 — Geometri alanı: köşe yarıçapı, boş giriş, konum modeli

**Kapsam:** Özellik Denetçisi'ndeki "Geometri" alan seti (rect/circle/ellipse/line).

**Karar / kabul ölçütleri:**

1. **rect köşe yarıçapı (rx/ry):** Bir nesne seçildiğinde kutular **etkin değeri**
   gösterir — SVG'de `rx` yoksa `ry`'ye, `ry` yoksa `rx`'e eşittir; dolayısıyla
   hiçbir kutu yanıltıcı biçimde boş kalmaz.
2. Köşeler varsayılan **bağlıdır**: tek değer girince hem `rx` hem `ry` yazılır
   (köşeler eşit). Bağlama, **asma kilit ikonuyla** gösterilir/değiştirilir —
   **kapalı kilit = bağlı**, **açık kilit = bağımsız** (açıkken ayrı rx/ry; SVG
   bunu desteklediği için).
2b. **Etiketler Türkçe (§3):** kelime-temelli geometri etiketleri Türkçedir
   (Genişlik, Yükseklik, Yarıçap). Koordinat sembolleri (x, y, sx, sy, tx, ty,
   rx, ry, x1…) SVG/matematik gösterimi olarak kalır.
3. **Boş/null giriş engellenir:** Sayısal kutuya boş ya da geçersiz değer girilip
   onaylanırsa yazılmaz; kutu eski değerine döner.
4. **Konum modeli (CLAUDE.md §9.8):** Geometri içinde x/y (canlı) · sx/sy (sabit
   baseline, salt-okunur) · tx/ty (ofset, düzenlenebilir) gösterilir; `x = sx + tx`
   bağlayıcı kuralı korunur. (Bu madde kuralın uygulanışıdır; tasarım notu olarak
   burada da izlenir.)

> Not: ellipse'te rx/ry **yarıçaptır** (köşe değil) → bağımsız ve "Bağla"sız.

---

## TK-4 — Yerel pencereler (dialog) ana pencereye bağlıdır

**Kapsam:** Dosya aç/kaydet gibi yerel sistem pencereleri.

**Karar / kabul ölçütleri:**

1. Yerel dialog'lar **ana pencereye bağlı (modal)** açılır; görev çubuğunda/
   pencere yöneticisinde **ayrı bir uygulama/pencere olarak görünmez**.
2. Teknik: IPC handler dialog'u olayı gönderen `BrowserWindow`'a bağlar
   (`dialog.showOpenDialog(pencere, …)`).

---

## TK-5 — Görünüm denetçisi: efektif okuma, inline-style yazma

**Kapsam:** Özellik Denetçisi "Görünüm" alan seti (dolgu, kontur, saydamlık).

**Sorun:** Dolgu/kontur değeri çoğu zaman `fill`/`stroke` attribute'undan değil,
**CSS sınıfından** ya da **gradient referansından** (`url(#id)`) gelir. Attribute
okumak yanlış/boş değer gösterir; attribute yazmak da CSS sınıfını **ezemez**
(CSS > attribute), değişiklik uygulanmaz.

**Karar / kabul ölçütleri:**

1. **Okuma — efektif (hesaplanmış) değer:** Değerler, render edilen elemanın
   `getComputedStyle` çıktısından okunur. Böylece sınıftan/gradient'ten gelen
   gerçek renk doğru görünür. (Tuval, render erişimini `cizim-erisimi` ile yayınlar.)
2. **Yazma — inline style (Command ile):** Düzenleme nesnenin `style` özelliğine
   (inline) yazılır → inline style > sınıf > attribute olduğundan değişiklik HER
   ZAMAN uygulanır (nesne-düzeyi geçersiz kılma). Sınıfların kendisini düzenlemek
   Faz E'nin konusudur.
3. **Renk kutusu** yalnızca düz renkte (rgb) etkindir; gradient/`none` durumunda
   devre dışıdır ve metin alanı kullanılır (kullanıcı renk yazarak ezebilir).
4. **Kontur (`stroke`) ve kontur kalınlığı (`stroke-width`)** Görünüm alanındadır
   — bunlar §10.5 DENETÇİ alanlarıdır, **ileri faz değil**.

---

## TK-6 — Gelişmiş boya (renk) seçici

**Kapsam:** Görünüm denetçisindeki dolgu/kontur renk seçimi.

**Sorun:** Native `<input type="color">` Wayland'de açılmıyordu; ayrıca yalnız düz
hex (alfa/format/gradyan yok).

**Karar / kabul ölçütleri:**

1. Native renk kutusu yerine **özel `boya-secici`** kullanılır (her platformda
   açılır; popover).
2. **Düz renk:** doygunluk/parlaklık (SV) karesi + ton kaydırıcısı + **alfa**
   kaydırıcısı + hex/rgb girişi. Değer `rgb()`/`rgba()` olarak yazılır.
3. **Gradyan:** seçici **Doğrusal/Radyal** modlarını sunar; **N durak** (ekle/sil),
   her durak için renk (aynı SV/ton/alfa seçici) + konum, doğrusalda **açı**.
   Uygulanınca gradyan **defs'e bir kaynak** olarak yazılır ve `fill`/`stroke`
   `url(#id)` olur — hepsi tek, geri-alınabilir komut (BilesikKomut). Önceki
   (bizim ürettiğimiz) gradyan temizlenir.
4. **Yok** modu saydam yapar; metin alanı url/none/adlandırılmış renk için kalır.

---

## TK-7 — Yapışma ve akıllı kılavuzlar (§11.1)

**Kapsam:** Seç aracıyla nesne(ler) taşırken hizalama yardımı.

**Karar / kabul ölçütleri:**

1. **Görünüm durumu, undo'ya GİRMEZ.** Kılavuzlar ve yapışma yalnızca taşıma
   önizlemesini etkiler; commit edilen tek şey sonuç ötelemesidir (tek Command,
   İlke 9). Geometri saf bir modüldedir (`tuval/yapisma.ts`) — DOM/belge/Command
   bilmez.
2. **Hedefler:** seçili olmayan üst-düzey nesnelerin sınır kutuları + **tuval
   (kök SVG) çerçevesi**. Yapışma noktaları her kutunun **sol/merkez/sağ** (x) ve
   **üst/orta/alt** (y) çizgileridir (kenar↔kenar, kenar↔merkez, merkez↔merkez).
3. **Eşik ekran-uzayındadır (6 px).** Böylece yakınlaştırmadan bağımsız, hep aynı
   "his". Her eksende en küçük düzeltme seçilir; iki eksen bağımsızdır.
4. **Kılavuz çizgisi**, yapışılan çizgiye değen tüm hedefleri + taşınan kutuyu
   kapsayacak şekilde uzatılır. Renk **tema-bağımsız magenta** (`--kilavuz`,
   fallback `#ff3b8d`) — Figma/Sketch gibi kasıtlı sinyal rengi.
5. **Alt** basılı tutmak yapışmayı **kapatır** (serbest taşıma). Taşıma sırasında
   Alt başka bir işlev taşımadığından (§9.7 yalnız kement modifiye eder) çakışma
   yoktur.
6. **Çerçeve sözleşmesi additive büyüdü:** `AracBaglami`'ye `kilavuzCiz()` eklendi
   (mevcut `kementCiz()` deseni gibi). Var olan imza değişmedi → İlke 4/5'e uygun,
   kabuk değişmedi.

---

## TK-8 — Komut Paleti (Ctrl/Cmd+K) (§11.3)

**Kapsam:** Her aracı ve menü eylemini arayıp çalıştıran hızlı erişim.

**Karar / kabul ölçütleri:**

1. **Görünüm durumu, undo'ya GİRMEZ.** Palette yalnız bir eylemi tetikler; eylemin
   kendisi (varsa) Command üretir (İlke 9).
2. **Eylemler registry'den toplanır** (İlke 5): `aracKayitDefteri` (araçlar) +
   `menuKayitDefteri` (menü ögeleri). Palette hiçbir özelliği bilmez; yeni araç/menü
   ögesi otomatik belirir, bu dosya **değişmez**.
3. **Kabuğa dokunulmaz:** palette panel registry'sine kaydolur ama tam-ekran
   `position: fixed` bindirme olarak çizilir (bölge `overflow:hidden`'ı fixed'i
   kırpmaz). Servisleri `PanelBaglami`'den alır; menü eylemleri için `hataBildir`
   yerelde üretilir.
4. **Etkileşim:** Ctrl/Cmd+K aç/kapat (global, yakalama fazı); yazarak süz; ↑/↓ gez,
   Enter çalıştır, Esc/perde-tıkla kapat. Eşleşme Türkçe-duyarlı küçük harf (`tr`).

---

## TK-9 — Düğüm aracı (node edit) (§9.2, §11.6 1. dalga)

**Kapsam:** Seçili `path`/`polyline`/`polygon`/`line`'ın çapa ve Bézier düzenlenmesi.

**Karar / kabul ölçütleri:**

1. **Tam kapsam:** on-curve çapa noktaları + path'te C/S/Q/T eğri kontrol
   tutamaçları. Çapayı taşımak **bitişik tutamaçları** (gelen `c2`, giden
   `c1`/`c`) birlikte taşır; bir tutamaç tek başına eğriyi büker (yansıtma/mirror
   yok — v1).
2. **Path mutlak-normalize edilir** (`cekirdek/belge/model/yol.ts`, saf, İlke 1):
   bağıl→mutlak, `H`/`V`→`L`, `S`→`C`, `T`→`Q`; `A` yay birebir korunur (yaklaşım
   yok). Geometri aynı; yalnız temsil normalleşir. Birim testli (round-trip,
   yansıma, ayırıcısız yay bayrakları, `10-20`/`1.5.5`, üs).
3. **Her sürükleme tek Command** (İlke 2): canlı önizleme yalnız DOM'a yazar; bırakınca
   native öznitelik(ler)e (`path→d`, `poly→points`, `line→x1..y2`) **BileşikKomut**
   commit edilir. polyline/polygon/line kendi öz biçiminde yazılır (path'e dönüşmez).
4. **Çerçeve additive büyüdü (özellik-bağımsız):** `Arac.tutamacGizle` (Tuval kendi
   boyut tutamaçlarını gizler), `Arac.konumla()` (her kare yeniden yerleştir) ve
   `AracBaglami.aracKatmani()` (ekran-koordinatlı bindirme kabı). Tuval hangi aracın
   aktif olduğunu bilmez → İlke 5/§6 korunur, kabuğa özellik gömülmedi.
5. **Bindirme** tuval seçim katmanında bir `<svg>`'dir; çapalar kare, tutamaçlar
   daire, bağlayıcılar çizgi. Yalnız işaretçiler `pointer-events:auto` — boş tıklama
   tuvale geçer (altındaki şekli seç / boşta bırak). Yakınlaştırma/kaydırma/animasyon
   `getScreenCTM` ile her kare izlenir (mevcut araçlarla aynı mekanizma).

---

## TK-10 — Boole (yol) işlemleri (§11.2)

**Kapsam:** Seçili kapalı şekilleri birleştir / çıkar / kesiştir / dışla.

**Karar / kabul ölçütleri:**

1. **Bağımlılık (onaylı):** `polygon-clipping@^0.15.7` — saf JS, native bağımlılık
   yok, ~350KB, Martinez-Rueda (Turf.js de kullanır). Gerekçe: sağlam poligon
   boole'u (self-intersection, delik, çoklu-poligon, dejenere durumlar) elle yazmak
   hataya çok açık; CLAUDE.md "büyük bağımlılıkta dur ve gerekçe sun" → kullanıcı
   onayı alındı.
2. **Düzleştirme ödünü:** şekiller **poligona** düzleştirilir (eğriler tarayıcının
   `getPointAtLength`'iyle örneklenir, ~2px adım). Sonuç poligonaldir — eğri-koruyan
   boole büyük bir motor (paper.js gibi) gerektirir; "minimal ama çalışan" için
   bilinçli ödün. Sonuç her motorda doğru render olur.
3. **Koordinat uzayı:** her operand `getCTM` ile **kök kullanıcı uzayına** pişirilir;
   sonuç tek `<path>` olarak köke eklenir (boole hiyerarşiyi düzler). `stroke-width`
   yerel ölçekte kopyalanır (ölçekli grup operandında küçük sadakat ödünü).
4. **Sıra ve stil:** operandlar belge sırasıyla (alttan üste) sıralanır; **fark = en
   alttaki eksi üsttekiler** (Inkscape/Inkscape "Difference"). Sonucun stili **en
   alttaki** operanddan alınır (geometri/transform/id hariç tüm boya/sınıf öznitelikleri).
5. **Tek Command:** operandlar silinir + sonuç eklenir → tek BileşikKomut (İlke 2,
   geri-alınır). Sonuç boşsa (örn. kesişmeyen kesişim) no-op + bilgi mesajı.
6. **Tetikleme:** menü registry'sinde **"Yol"** grubu (İlke 5) → menü çubuğu + Komut
   Paleti'nde otomatik; kabuk değişmez. Saf geometri (`bool-geometri.ts`) birim
   testli (donut/ada nesting, even-odd, d üretimi).

---

## TK-11 — Şekil Oluşturucu (§9.2, §11.6 2. dalga)

**Kapsam:** Seçili örtüşen şekilleri bölgelere ayırıp etkileşimli birleştirme.

**Karar / kabul ölçütleri:**

1. **Atomik yüzler:** N şeklin örtüşmesi 2^N−1 alt küme bölgesine ayrılır
   (`atomikYuzler`, polygon-clipping; N≤8). Boole altyapısı yeniden kullanılır
   (`dugumCokPoligonu`, `sonucuYaz`, `belgeSirasi` `bool.ts`'ten dışa açıldı).
   Birim testli (2 kare → 3 yüz, union, yüz-içinde).
2. **Etkileşim (v1):** her bölge tuval bindirmesinde tıklanabilir bir `<path>`tir;
   **başta hepsi dâhil** (= birleşim). Bir bölgeye tıklamak onu **dâhil/çıkar**
   yapar (çıkarınca delik). **Enter** = sonucu işle, **Esc** = tümünü geri dâhil et.
   Dâhil bölgeler dolu/koyu, çıkanlar soluk/kesik-çizgili; hover vurgulu.
3. **Sonuç:** dâhil bölgelerin birleşimi tek `<path>` (ayrık bölgeler bileşik yol);
   operandlar silinir + sonuç eklenir = tek Command (`sonucuYaz`, boole ile ortak).
4. **Görünüm durumu:** bölge seçimi/hover undo'ya girmez (İlke 9); yalnız Enter'daki
   sonuç Command üretir. Bindirme `tutamacGizle` + `aracKatmani` + `konumla` jenerik
   çerçevesini kullanır (Düğüm aracıyla aynı, additive).

---

## TK-12 — Semboller / Bileşenler (§11.3, §10.4, 2. dalga)

**Kapsam:** `<symbol>` + `<use>` ile yeniden kullanılabilir bileşenler.

**Karar / kabul ölçütleri:**

1. **Sembol Yap:** seçim `<defs>`'teki bir `<symbol id="sembolN">`'e taşınır, yerine
   `<use href="#sembolN">` konur. Tek BileşikKomut (operandları çıkar + defs'e symbol
   ekle + use ekle, İlke 2). Düzen menüsü/Komut Paleti'nden (registry).
2. **Örnek = `<use>` çoğaltmak:** mevcut "Çoğalt" `id`'yi atıp `href`'i koruduğundan
   bir `<use>`'u çoğaltmak senkron yeni örnek üretir — ayrı kod gerekmedi. Ana sembol
   değişince tüm örnekler kendiliğinden güncellenir (`<use>` canlı referans, İlke 3).
3. **Konum korunur:** `<symbol overflow="visible">` + `<use>` (width/height yok) içeriği
   özgün koordinatlarda render eder (viewBox/ölçek yok).
4. **Sembolü Genişlet:** seçili `<use>`, sembol içeriğinin **id'siz derin kopyası** ile
   değiştirilir; `<use>`'un x/y/transform'u saran `<g>`'ye taşınır (bağ çözülür,
   düzenlenebilir). Tek Command.
5. **Sınır (v1):** ana sembolü *yerinde* düzenleme (isolation/izolasyon modu) henüz yok;
   düzenlemek için "Sembolü Genişlet" → düzenle → yeniden "Sembol Yap" ya da kod paneli.
   İzolasyon modu sonraki adım. Export: `symbol`/`use` kara listede değil (üretilir).

---

## TK-13 — Güvenlik sıkılaştırma (kod denetimi sonrası)

**Kapsam:** Electron ana süreç gezinme/dış-bağlantı politikası, güvenilmeyen SVG
içe aktarım sanitizasyonu, CSP. Uygulamanın özü güvenilmeyen SVG dosyalarını
yüklemek olduğundan bunlar güvenlik zemininin parçasıdır.

**Karar / kabul ölçütleri:**

1. **`shell.openExternal` şema allow-list'i:** Yalnız `http:` / `https:` / `mailto:`
   şemaları dışarı (varsayılan tarayıcıya) verilir; `file:` / UNC (`\\sunucu\…`,
   NTLM-hash sızması) / özel-uygulama protokolleri reddedilir. `setWindowOpenHandler`
   her durumda `{ action: 'deny' }` döner (parse hatası dahil). (`src/main/pencere.ts`)
2. **Gezinme engeli:** `will-navigate` + `will-frame-navigate` — yalnız uygulamanın
   kendi **origin'ine** (dev sunucusu) ya da `file:`'a gezinmeye izin; harici adres
   `preventDefault` ile engellenir ve güvenliyse `openExternal`'a yönlendirilir.
   Origin bazlı karşılaştırma (katı eşitlik değil) → iç yol/hash navigasyonları
   yanlışlıkla engellenmez. (Aksi halde renderer yerini saldırgan sayfasına bırakır,
   `window.api` köprüsü ona açık kalırdı.)
3. **İçe aktarım sanitizasyonu (derinlemesine savunma):** `iceAktar` (`ice-aktar.ts`)
   normalize aşamasında **`<script>` öğelerini, `on*` event handler özniteliklerini
   ve `javascript:` href'leri** modele HİÇ almaz. Editör hiçbir zaman yazar betiği
   çalıştırmaz. Tek nokta hem canlı render'ı (yansıtıcı) hem dışa aktarımı temizler;
   `foreignObject` gibi meşru yapılar korunur. CSP **tek** savunma hattı olmaktan çıkar.
4. **CSP:** `object-src 'none'` + `base-uri 'none'` eklendi (`<base>` enjeksiyonu /
   eklenti yüzeyi kapatılır). `frame-ancestors` meta etiketinde **inert** olduğundan
   eklenmedi. `img-src 'self' data:` görsel data-URI için ŞART (kaldırılmamalı).

**Durum ayrımı:** Hepsi ana süreç/policy katmanıdır; belge modeline ve undo'ya
dokunmaz. `contextIsolation:true` / `nodeIntegration:false` / `sandbox:true` zaten
yerindeydi — bunlar onların üstüne eklenen katmanlardır.

---

## TK-14 — Araç/eylem bildirim kanalı (toast)

**Kapsam:** Araçların ve menü/dosya/yol eylemlerinin kullanıcıya **geçici** mesaj
göstermesi (sessiz no-op yerine görünür geri bildirim).

**Sorun:** Araçlar sessiz no-op yapıyordu (Pipet hedef seçili değilken hiçbir şey
olmuyor → kullanıcı "çalışmıyor" dedi, Y3). Eski tek "hata" span'i yalnız
menü/dosya eylemlerine bağlıydı, Üst Çubuk'ta yalnız toplu modda görünüyordu ve
belge değişene kadar kalıcıydı.

**Karar / kabul ölçütleri:**

1. **Tek `bildirimServisi` singleton** (`kabuk/bildirim-servisi.ts`) — **görünüm
   durumu** (İlke 9): belge modeline dokunmaz, **Command üretmez, undo'ya GİRMEZ**.
   Üreticiler `bildir(mesaj, tur)`, kabuk `dinle` ile abone.
2. **`AracBaglami`'ya additive `bildir(mesaj, tur?)`** eklendi (İlke 4 — yeni
   yetenek = sözleşmeye ekle); Tuval `#aracBaglami`'da servise yönlendirir. Araçlar
   servisi doğrudan import etmez (decoupled; yalnız `baglam.bildir`).
3. **Tek yüzey:** mevcut `hataBildir` tüketicileri (menü/dosya/yol eylemleri +
   komut paleti) de aynı servise yönlendirildi; ayrı "hata" span'i kaldırıldı.
4. **Toast:** kabuk geçici bildirimi viewport altına ortalı çizer; tür
   (bilgi/uyarı/hata) rengi + süreyi (2.5 / 4 / 5 sn) belirler, kendiliğinden
   kapanır. Her moddan (toplu/menü) bağımsız görünür (`position: fixed`).
5. **Mesajlar i18n** (`tr.dil`): `pipet.hedefYok`, `gorsel.yuklenemedi`.

**Bağlanan araçlar (ilk tur):** Pipet (hedef seçili değilken uyarı), Görsel
Yerleştir (yüklenemeyince/iptal hata). Yeni araçlar aynı kanaldan ücretsiz
yararlanır.

---

## TK-15 — Canlı referans indeksi + güvenli kaynak silme (Faz F çekirdeği)

**Kapsam:** Referans indeksinin komut sonrası güncelliği ve kaynak (defs/style)
silmenin **dangling** referans bırakmaması (§8.2, İlke 7).

**Karar / kabul ölçütleri:**

1. **Canlı indeks (tembel):** `belge.referansIndeksi` artık getter; `bildir()`
   indeksi **kirletir**, ilk erişimde O(n) yeniden kurulur. Sık `bildir`'de boşuna
   kurulmaz, ama her okuma günceldir (bayatlamaz).
2. **İndeks kapsamı:** `url(#id)` doğrudan öznitelikler + **inline `style`** +
   `href`/`xlink:href` (çıplak `#id` ve `url()`, çoklu `url()`) + `class`. (Panel
   uygulama stratejileri `url`'yi `style`'a yazdığından `style` parsing şarttır.)
3. **Güvenli silme:** `kaynakReferansTemizle(belge, id, sinifMi)` atıf veren
   şekillerden referansları kaldıran komutları üretir; silme komutuyla **aynı
   BilesikKomut**'a konur → tek geri-al adımı, dosya geçerli kalır (dangling yok).
   `url`: `style` bildirimi düşürülür / doğrudan attr `url()`'si çıkarılır / `href`
   boşaltılır. `sinif`: `class` token'ı çıkarılır. (Saf çekirdek; birim testli 9/9.)
4. **Bildirim (modal değil):** Etkilenen şekil varsa toast (TK-14) "N şekildeki
   kullanım da temizlendi (geri alınabilir)". Onay diyaloğu yok; **geri-al
   güvencesi** yeterli kabul edildi.
5. **`KaynakTuru.referansTuru`** (`'url' | 'sinif'`, additive): hangi referans
   uzayında arandığını belirler; stil `'sinif'`, diğerleri `'url'` (varsayılan).

**Sınır (v1):** "Kullanıldığı yerler" listesi UI'ı ve güvenli yeniden
**ADLANDIRMA** henüz yok (Faz F'in kalanı); altyapı (canlı indeks + temizleme) hazır.

---

## TK-16 — Dejenere şekil sadeleştirme (path→çizgi, sıfır-boyut temizliği)

**Kapsam:** "Belge" menüsü; render bbox'ına göre dejenere (bozuk/sıfır) şekilleri
sadeleştirir. Tek, geri-alınabilir işlem.

**Karar / kabul ölçütleri:**

1. **path + TEK boyut ≈ 0 → `<line>`:** Render bbox'ında genişlik VEYA yükseklik
   ≈ 0 (eşik 1e-6) olan bir `path` aslında bir çizgidir; yönüne göre (height≈0 →
   yatay, width≈0 → dikey) eşdeğer `<line x1 y1 x2 y2>`'ye çevrilir. `d` düşürülür,
   diğer öznitelikler (stroke/style/`id`/transform/marker...) KORUNUR — `id`
   korunduğundan ona verilen referanslar geçerli kalır.
2. **Her İKİ boyut ≈ 0 → otomatik sil:** Görünmez (görsel) yaprak nesne
   (rect/circle/ellipse/line/polyline/polygon/path/text/image/use/foreignObject)
   silinir. Ona atıf veren varsa (`id` referans alıyorsa, referans indeksiyle
   kontrol) dangling bırakmamak için ATLANIR.
3. **Tanım konteynerleri atlanır:** `defs`/`symbol`/`clipPath`/`mask`/`marker`/
   `pattern`/gradient/`filter`/`style`/`title`/`desc`/`metadata` altındaki şekiller
   geometri/tanımdır → sadeleştirilmez.
4. **Tek BilesikKomut:** tüm çevirme + silme tek geri-al adımı; sonuç toast'la
   bildirilir (kaç path→çizgi, kaç silme — TK-14 kanalı).
5. **Geometri kaynağı render bbox'ıdır** (`getBBox`, `cizimErisimi`): yalnız tuvalde
   çizili belgede çalışır. **İçe-aktarımda OTOMATİK çalışMAZ** (İlke 8: kabul ederken
   esnek — dosya, kullanıcı tetikleyene dek olduğu gibi kalır).

**Yeni komut ilkeli:** `DugumDegistirKomutu` (`komutlar/dugum-komutlari.ts`) — bir
düğümü ebeveyni içinde AYNI konumda başkasıyla değiştirir; konum çalışma anında
`indexOf` ile bulunur (aynı BilesikKomut içindeki başka ekleme/çıkarmaların index
kaymasından bağımsız). Birim testli (yerinde değiştirme + robustluk + geriAl).

---

## TK-17 — Denetçi/ray/hizalama/marker/seçim UI (kullanıcı geri bildirimi)

**Kapsam:** Sağ panel ve Tuval seçim deneyimi iyileştirmeleri.

**Karar / kabul ölçütleri:**

1. **Özellik Denetçisi sağ içeriğin tamamını doldurur:** `:host` artık
   `flex: 1 1 auto` (eski `flex:0 0 auto; max-height:55%` kaldırıldı). Ray tek
   panel açtığından (Y7) denetçi sağ içeriğin boyunu kaplar; içerik uzunsa kaydırır.
2. **Sağ ray simgeleri SVG:** Harf yerine gruba uygun ikon. `PanelKaydi.ikon`
   (opsiyonel `TemplateResult`, additive — verilmezse başlığın ilk harfine düşülür).
   Denetçi (kaydırıcı) · Katmanlar (yığın) · Geçmiş (saat) · Hizalama (hizalama
   çubuğu) · Tanımlar (swatch). Kabuk `p.ikon ?? harf` çizer (İlke 5, kabuk değişmez).
3. **Hizalama paneli yol eylemlerini de içerir:** Panel, menü registry'sindeki
   **`yol`** grubunu (boole: birleşim/fark/kesişim/dışla + tersCevir/basitleştir)
   çekip ikon-butonlar olarak çizer → yeni bir yol eylemi (menü kaydı) otomatik
   belirir. Eylemler artık menü + Komut Paleti + **sağ panel** üçünde de var; mantık
   tek yerde (registry), kopya yok. Boole düğmeleri n<2'de, hizalama n<2/dağıt n<3'te
   pasif; yetersiz seçimde eylem toast'la (TK-14) uyarır.
4. **Marker denetçi alanı** (`marker-alan-seti.ts`): `path`/`line`/`polyline`/
   `polygon` seçiliyken denetçide üç kutu (sırasıyla başlangıç · orta · bitiş;
   konum etiketi YAZILMAZ, tooltip'te). Kutuda marker'ın **canlı önizlemesi**
   gösterilir (render edilen `<marker>` çocukları klonlanıp `viewBox`'a ölçeklenir;
   `context-fill`/`context-stroke` → `currentColor`). **Kontrast:** marker rengi kutu
   zeminine (tema yüzeyi) yakınsa kutu zemini okunabilir bir renge çekilir
   (marker açıksa koyu zemin, koyuysa açık). Bir kutuya tıklamak o pozisyon
   (`marker-start`/`-mid`/`-end`) için belgedeki marker'lardan seçtiren menü açar;
   **Yok** referansı kaldırır. Yazım moda göre (TK-18), tek Command. **Okuma
   efektiftir** (`getComputedStyle`, TK-5): marker çoğu zaman bir CSS sınıfından
   gelir (`.cls { marker-end: url(#id) }`); kutu render edilen elemanın hesaplanmış
   değerini gösterir (eleman yoksa modele düşer).
5. **Seçim çerçevesi:** `.cerceve` **%50 transparan** (`opacity:.5`). Nesne
   **taşınırken** (gövde sürüklemesi, >4px eşik) çerçeve + boyut/uç tutamaçları
   gizlenir; fare **bırakılınca** tekrar görünür. (Handle sürüklemeleri etkilenmez —
   onlar `#basNokta` kurmaz.) Görünüm durumu; undo'ya girmez.

---

## TK-18 — Stil yazım modu (inline / CSS sınıf / otomatik)

**Kapsam:** Tüm uygulama stratejilerinin (fill/stroke/opacity/stroke-width/marker/
filter/gradient/clip-path/mask...) stili NASIL yazdığı. TK-5 "inline style yaz"
kuralını seçilebilir bir moda genelleştirir.

**Karar / kabul ölçütleri:**

1. **Tercih:** `stilYazimModu` (`boya/stil-yazim-modu.ts`) — görünüm durumu
   (İlke 9: Command üretmez, undo'ya girmez), localStorage'da kalıcı. **Varsayılan
   Otomatik.** UI: Özellik Denetçisi başlığı altında seçici.
2. **Tek yardımcı:** `stilUygulaKomutu(belge, dugum, ozellik, deger)` — TÜM apply
   stratejileri bunu çağırır (tek yer). Moda göre:
   - **Inline:** `style` özniteliği (TK-5'in önceki davranışı).
   - **CSS:** **nesne-başına** `.svgtron-stil-N` sınıfı; `<style>` kuralı güncellenir
     (yoksa defs'te oluşturulur); o özelliğin INLINE gölgesi temizlenir. Bir nesneyi
     düzenlemek yalnız onu etkiler (kendi sınıfı; **paylaşımlı değil** → undo/komut
     güvenli, sürpriz yok).
   - **Otomatik:** "o nesnenin özelliğine göre" — nesnenin kendi `svgtron-stil`
     sınıfı varsa ya da `<style>`'da tanımlı bir sınıf taşıyorsa CSS; inline `style`'ı
     varsa inline; tamamen yeni ise belge konvansiyonu (CSS ağırlıklıysa CSS).
3. **CSS kural editörü** (`stil-css.ts`, saf): `@keyframes`/`@media`/yorumları KORUR —
   yalnız hedef basit kuralı (`.sinif { ... }`, iç-brace yok) düzenler; yeni kuralları
   metin sonuna ekler.
4. **Okuma efektiftir** (getComputedStyle, TK-5): her iki modda da denetçi doğru
   görünür (marker/fill/stroke sınıftan da gelse).
5. **Animasyon:** Editör henüz animasyon ÜRETMEDİĞİNDEN somut bir animasyon-uygulama
   işlemi yok; ama yardımcı **özellik-agnostiktir** (`animation`/`transition` gibi CSS
   özellikleri de aynı yoldan geçer) → animasyon yazımı eklendiğinde mod onu otomatik
   kapsar. (Bu, kullanıcının "+animasyon" kapsam seçiminin gerçekçi karşılığıdır.)

**Yönlendirilen siteler:** görünüm alan-seti · marker alan-seti · tüm tanımlar
türleri (filtre/gradyan/desen/marker/kirpma/maske) · gradyan-model · pipet. (Stil
türü zaten class-tabanlıdır; değişmedi.) Birim test: cssKuralYaz + inline/css/oto +
sınıf yönetimi + inline-gölge temizliği — 21/21.

---

## TK-19 — Biçimli (girintili) SVG çıktısı

**Kapsam:** `disaAktar` çıktısı — canlı SVG kod paneli, kaydet ve dışa aktar.

**Sorun:** Çıktı tek satıra birleştiriliyordu (`parcalar.join('')`) → kod paneli
okunamaz hâldeydi.

**Karar / kabul ölçütleri:**

1. **`disaAktar` varsayılan BİÇİMLİ** (girintili, çok satırlı; 2 boşluk/derinlik) →
   okunabilir SVG. `bicimli=false` parametresiyle tek satır (biçimsiz) alınabilir.
   Tüm çağıranlar (kod paneli, kaydet, "temiz" dışa aktar) varsayılanı kullanır.
2. **Anlamlı boşluk korunur:** `text`/`tspan`/`textPath`, metin-yaprakları ve
   `<style>` (CSS) **SATIR-İÇİ** yazılır — eklenen girinti/yeni satır bunların render'ını
   (metin boşluğu, CSS) bozardı. Yalnız YAPISAL elemanların (svg/g/defs/...) çocukları
   girintilenir.
3. **Round-trip temiz:** Elemanlar arası eklenen boşluk SVG'de yok sayılır ve
   içe-aktarıcı tarafından atılır (text düğümleri yalnız yaprakta `metin` olur) →
   formatlama modelde birikmez, kod panelinde uygula-yeniden-göster döngüsü kararlı.
4. Kilit yorumu (İlke 10) kendi girintili satırında yazılır.

Birim test: girinti seviyeleri · text/`<style>` satır-içi korunumu · self-close ·
kilit yorumu · biçimsiz mod — 12/12.

---

## TK-20 — Dosya menüsü: "Yeni" + "Son Dosyalar"

**Kapsam:** Dosya menüsüne yeni belge oluşturma ve son açılan dosyalar listesi.

**Karar / kabul ölçütleri:**

1. **Yeni:** Boş 800×600 tuval (`<svg viewBox="0 0 800 600">`) yükler; seçim ve
   geçmiş temizlenir. Kaynak adı `adsiz.svg`. Registry menü ögesi (`dosya.yeni`, sira 5).
2. **Son Dosyalar:** `sonDosyalar` deposu (görünüm durumu, İlke 9; localStorage'da
   kalıcı) — en yeni başta, en çok 8 kayıt, aynı yol tekrarlanmaz. Dosya açılınca
   (Aç ya da son-dosyadan) yola sahipse kaydedilir.
3. **Menüye enjeksiyon:** Liste dinamik olduğundan registry'ye değil, kabuğun
   `menuGruplari()`'sinde **Dosya grubuna** alt menü olarak eklenir (dil grubu gibi).
   Boşsa görünmez.
4. **Yeniden açma:** Yeni IPC kanalı `dosyaYoldanAc(yol)` → main `svgYoldanAc`.
   **Güvenlik:** yalnız `.svg` uzantılı yollar okunur (rastgele dosya okuma yüzeyini
   daraltır); okunamayan yol kullanıcıya bildirilir ve listeden düşürülür.

**Not — marker düzenleme/çizme:** Kaynak türlerinin (§8.1) "düzenleyici" yüzü henüz
yok; marker/filtre/gradyan **oluştur/uygula/sil** var ama geometrisini UI'dan
düzenleme yok (şimdilik kod paneli). Marker editörü ayrı bir iş olarak bekliyor.

---

## TK-21 — Grup iki-aşamalı seçim + tutamaç görünürlüğü/boyutu

**Kapsam:** Seç aracı grup seçimi, sürükleme eşiği, boyutlandırma tutamaçları.

**Karar / kabul ölçütleri:**

1. **Grup-duyarlı seçim:** Bir nesne bir `<g>`'ye aitse, İLK tıklamada EN DIŞTAKİ
   grup seçilir; çerçeve/tutamaçlar içerikten ~2px boşlukla + **kesik çizgili**
   (`.cerceve.grup`) görünür; taşıma/boyutlandırma/efekt **grubun tamamına** etkiler.
   Grup SEÇİLİYKEN içine **sürüklemek grubu taşır**, **tıklamak içindeki nesneye
   iner** (drill; normal çerçeve/tutamaçlar). `enDistakiGrup`/`atasiMi`
   (`cekirdek/belge/grup.ts`, saf, birim testli 12/12). **Kilitli grup terfi etmez**
   (sürüklemeyle taşınmaz, §9.7).
2. **TEK sürükleme eşiği** `SURUKLEME_ESIGI = 4` (`araclar/arac.ts`): Tuval'in
   tıkla↔sürükle ayrımı VE araçların taşıma/kement başlatması aynı eşiği kullanır →
   eski "ölü bant" (tuval 4px vs sec-araci 3px) kapandı. Kement de eşiğe bağlı →
   mikro-titreme seçimi temizlemez.
3. **Shift+drill:** Grup seçiliyken çocuğa Shift+tıklama grubun yerine çocuğu seçer
   (düz replace) — atası ile çocuğu birlikte seçmek çift-dönüşüm riski yaratırdı.
4. **Tutamaç görünürlüğü:** Zıt renkli koyu halka (`box-shadow: 0 0 0 1px rgba(0,0,0,.55)`)
   → açık zeminde/kutuda da görünür (per-nesne renk hesabına gerek yok). Boyut
   tutamacı 7×7 (eski 9×9), uç tutamacı 9×9 (eski 11×11) — küçük nesneleri kapatmasın.
5. **Nudge kilit denetler:** Ok tuşuyla kilitli düğümler taşınmaz (Katmanlar'dan
   seçilse bile).

**Doğrulama:** Durum-makinesi adversaryal inceleme workflow'uyla denetlendi
(13 ajan → 10 onaylı bulgu); hepsi düzeltildi (eşik birleştirme kök neden).

---

## TK-22 — Grup geometri düzenleme (denetçi) + boole grup koruması

**Kapsam:** Özellik Denetçisi'nde grup (ve path/poly) konum+boyut düzenleme;
döndürme/yansıtma ve boole işlemlerinin grup davranışı.

**Karar / kabul ölçütleri:**

1. **Grup + doğal x/y'si olmayan şekiller (path/polyline/polygon):** Denetçi
   "Geometri" bölümü **transform-tabanlı** x/y/width/height gösterir (getBBox ×
   eleman transform → ebeveyn-uzayı sınır kutusu). Düzenleme transform'un BAŞINA
   öteleme (konum) ya da sol-üst etrafında ölçek (boyut) ekler — tek Command.
   **Grupta ölçek çocukları ORANSAL büyütür/küçültür** (kullanıcı isteği).
   Döndürülmüş elemanda boyut eksen-hizalı AABB üzerinden çalışır (yaklaşık).
2. **Döndürme/yansıtma bütüne etkiler:** TK-21'den beri grup seçilince `<g>`'nin
   kendisi seçili olduğundan, döndürme tutamacı ve Yatay/Dikey Yansıt komutları
   grubun transform'una eklenir → grup BÜTÜN olarak döner/aynalanır (ek kod yok).
3. **Boole grupta pasif:** Birleştir/Çıkar/Kesiştir/Dışla bir GRUP seçiliyken
   çalışmaz — Hizalama panelinde yol düğmeleri `disabled` + `booleUygula` grup
   operandını reddeder (`'yetersiz'`) → menü ve Komut Paleti de pasifleşir.

---

## TK-23 — Artboard (sayfa zemini) tanımı

**Kapsam:** Bir SVG'nin en alttaki (z-en arka) elemanı çoğu zaman **sayfa
zemini/artboard** olarak tasarlanır. Kullanıcı bunu editöre tanıtabilsin;
editör de uygun adayı otomatik önerebilsin (kullanıcı isteği).

**Karar / kabul ölçütleri:**

1. **Artboard = kilitli zemin + sayfa çerçevesi** (AskUserQuestion seçimi).
   Bir düğüm `artboard` bayrağıyla işaretlenince:
   - **daima kilitlidir** — `ArtboardKomutu` bayrakla birlikte `kilitli`'yi de
     ayarlar (artboard ⇒ kilit; kaldırınca kilit de açılır). Böylece zemin
     yanlışlıkla taşınmaz (§9.7 amacıyla örtüşür).
   - Tuval'de **sayfa çerçevesi** çizilir: elemanın ekran sınırına soluk, ince,
     seçimden bağımsız bir çerçeve. Seçim taşıma korumasından ÖNCE çizildiği için
     başka nesne sürüklenirken bile görünür kalır.
2. **Otomatik algıla + buton** (AskUserQuestion seçimi). Katmanlar paneli kökün
   en alttaki grafiksel çocuğunu **aday** olarak değerlendirir: render edilmiş
   bbox'ı SVG ölçülerine (viewBox; yoksa width/height) **~%2 toleransla** uyuyorsa
   o satırda **"Artboard yap"** butonu belirir. Zaten artboard olan satırda buton
   **"Artboard'u kaldır"** olur. Aday değilse buton görünmez (gürültü yok).
3. **Kalıcılık İlke 10 ile.** Bayrak SVG'ye ÖZNİTELİK olarak yazılmaz; nesnenin
   üstüne **editör yorumu** yazılır. Kilit ve artboard tek yorumda birleşir:
   `<!-- @svgtron lock=true artboard=true -->`. İçe aktarımda regex'lerle
   (`lock=true`, `artboard=true` — sıra bağımsız) geri yüklenir; `genis-uyumluluk`
   profilinde yorum hiç yazılmaz. Bayrak modelin parçasıdır (`Dugum.artboard`),
   dışa aktarıcı öznitelik olarak yok sayar.
4. **Geri-alınır.** İşaretleme/kaldırma tek `ArtboardKomutu`'dur; `geriAl` hem
   artboard hem kilit eski değerini geri yükler.
5. **Tam kapsama iki yoldan kabul edilir (kullanıcı isteği).** Yalnız sayısal
   bbox değil: `#tamKapsarMi` önce **öznitelik** tabanlı bakar — `width`/`height`
   YÜZDE (`100%`, ≥%99) ya da viewBox ölçüsüne ≈eşit sayısal + köşe (`x`/`y`) 0/yok
   → render bbox'a gerek kalmadan aday belirir; bu eşleşmezse **render bbox'ı**
   (~%2 tolerans, transform/şekil farkını ve yüzdeyi çözer) denenir.

---

## TK-24 — i18n: `en.dil` + kaynak-doğruluk kuralı

**Kapsam:** İngilizce dil dosyası ve `tr.dil`'in tek doğruluk kaynağı oluşu.

**Karar / kabul ölçütleri:**

1. **`en.dil` eklendi** (`src/renderer/diller/`). Dil yöneticisi `*.dil` dosyalarını
   derleme anında glob ile yükler → kod değişmeden yeni dil belirir; menüde "English"
   görünür.
2. **`tr.dil` ANAHTAR DOSYASIDIR (CLAUDE.md §3).** Yeni anahtar önce `tr.dil`'e,
   sonra `en.dil`'e. İki dosya arasında **anahtar kümesi ya da `{yer-tutucu}` farkı**
   olursa **`tr.dil` daima doğru**; `en.dil` ona hizalanır. Çalışma anında eksik
   çeviri Türkçe'ye, o da yoksa anahtara düşer. (Parite betikle doğrulanır: 160/160.)

---

## TK-28 — Dil dosyası otomatik senkron (çevrilmemiş `?` işareti)

**Kapsam:** TK-24 kuralının otomasyonu — tr harici dil seçilince eksik anahtarları
işaretleme.

**Karar / kabul ölçütleri:**

1. **Tr harici dil seçilince** (`dilYonetici.ayarla`/`baslat`), renderer `tr.dil`'de
   olup o dilde OLMAYAN anahtarları hesaplar ve main'e (`dil-servisi`) yollar; main
   bunları `<kod>.dil` KAYNAK dosyasına `anahtar = ?` olarak ekler. Böylece dosyada
   `= ?` arayarak çevrilmemiş anahtar bulunur ("bilebilelim").
2. **Geliştirme-zamanı bakım aracı.** Yalnız kaynak `.dil` diskte varsa çalışır
   (`existsSync`); üretimde (asar) sessiz no-op. Oturumda dil başına bir kez
   (`#senkronlananlar`).
3. **Güvenlik (İlke 4 kanalı).** Dil kodu `^[a-z]{2,8}$` + tr hariç; her anahtar
   `^[\w.-]+$` (yeni satır / `=` / boşluk yok → enjeksiyon yok); değer her zaman
   sabit `?`; yalnız mevcut dosyaya ekleme (yeni dosya/yol gezme yok); idempotent
   (zaten var olan eklenmez).
4. **`?` çalışma anında "yok" sayılır.** `cevir`, değeri tam `?` olan anahtarı
   çevrilmemiş kabul edip Türkçe'ye düşer → UI bozulmaz; `?` yalnız dosya içi
   geliştirici işaretidir.

---

## TK-29 — Denetçide Dönüşüm (transform) editörü

**Kapsam:** Boyutlandırma tutamaçlarının ürettiği `transform`'u görüp düzenleyebilme.

**Karar / kabul ölçütleri:**

1. **Neden transform?** Tuval'in boyutlandırma tutamaçları (`#tutamacTransform`)
   JENERİKtir — her şekle (rect/path/grup) pivot etrafında `translate·scale` (ya da
   `rotate`) ekler; bu yüzden bir `rect` bile `width`/`height` yerine `scale(...)`
   transform'u alır. Tek tip davranış tüm şekiller için çalışır.
2. **Ayrıştırılmış editör.** Denetçi "Geometri"sine bir **Dönüşüm** bölümü eklendi:
   render edilen elemanın KONSOLİDE matrisi (her notasyon — matrix/translate/rotate/
   scale/skew, zincirli olsa da — bir matrise iner) `donusumAyristir` ile öteleme
   (X/Y) · ölçek (X/Y) · döndürme (°) · eğme (°) bileşenlerine dökülür; bir alan
   değişince `donusumKur` ile yeniden birleşip tek, okunur `transform` yazılır (İlke 2).
   Round-trip kayıpsız (birim test 19/19). Böylece kullanıcı her notasyonu tek arayüzden
   düzenler → "farklı tanımlama" boşluğu yok.
3. **Yalnız native şekillerde** (inceleme düzeltmesi). rect/circle/ellipse/line'da
   konum+boyut (ÖZNİTELİK uzayı) transform'dan bağımsız olduğundan Dönüşüm editörü
   yanında gösterilir. g/path/poly'de geometri zaten transform'a PREPEND ederek
   düzenlendiğinden (bbox x/y/w/h), matris-replace eden ayrı editör ÇELİŞİRDİ → orada
   gösterilmez.
4. **Güvenlik düzeltmeleri (inceleme).** Ölçek alanı 0/`MIN_OLCEK` altını reddeder
   (`scale(0)` → tersinmez matris, eleman çökerdi); identity'ye dönüşte `transform`
   özniteliği boş bırakılmaz, SİLİNİR (`OznitelikDegistirKomutu` null = sil).

---

## TK-30 — Çoklu belge (sekmeler)

**Kapsam:** Aynı pencerede birden çok belge; Yeni/Aç yeni sekmede.

**Karar / kabul ölçütleri:**

1. **Vekil store mimarisi.** Paneller registry'den bir kez kurulur ve store'lara bir
   kez abone olur (kabuk değişmez, İlke 5). Her sekme (`Sekme`) KENDİ gerçek
   `BelgeDeposu`/`SecimDeposu`/`KomutGecmisi`'ne sahiptir. Paneller, `SekmeYoneticisi`'nin
   **vekil** store'larını görür (`*Vekil`, ilgili store'un alt sınıfı); vekil aktif
   sekmeye delege eder, sekme değişince yeniden bağlanıp panelleri uyarır → tüm
   kontroller AKTİF sekmede çalışır. Çekirdek store'lar hiç değişmez (İlke 1).
2. **Tek tuval / tek Playback.** Tuval ve `OynatmaDeposu` tektir; aktif belgeyi render
   eder. Sekme değişince vekil-belge bildirir → tuval yeniden yansıtır, `oynatma.svgAyarla`
   ile yeni belgeye bağlanır. **Zoom/pan sekme başına korunur** (inceleme düzeltmesi):
   tuval, belge-anahtarlı bir `WeakMap`'te görünümü saklar; sekmeye dönünce geri yükler,
   yalnız ilk görülen/yeni belgede sıfırlar. Sekme çubuğu görünür/gizli olunca `resize`
   tetiklenir → çerçeveler yeniden konumlanır.
3. **Yeni/Aç → yeni sekme.** `belgeyiKur`: aktif sekmede belge VARSA içerik yeni
   sekmede, yoksa aktif (boş) sekmede açılır. Belgeyi terk etmedikleri için Yeni/Aç/Son
   Dosya artık kaydetme sorusu SORMAZ (kullanıcı isteği).
4. **Kaydetme sorusu kapatmaya taşındı.** Bir SEKME kapatılırken (× / kuyruklu modal)
   ve PENCERE kapatılırken kaydedilmemiş değişiklik varsa sorulur; pencere kapanışında
   TÜM kirli sekmeler **sekme-başına** sorulur (her modal o sekmenin adını gösterir),
   "Kaydet" her birini sırayla (aktif yapıp) kaydeder, biri iptal edilirse kapanış durur.
   Sekme çubuğu ≥2 sekmede görünür; her sekmede ad + kaydedilmemiş noktası + kapat.
5. **Vekil güvenlik ağı (inceleme).** Vekiller alt-sınıf olduğundan eksik bir override
   derlemede yakalanmaz; yükleme anında `vekilTamMi` taban prototipiyle karşılaştırır,
   eksik üye varsa konsola bildirir (çekirdek store'a yeni üye eklenince fark edilir).

---

## TK-31 — Tuval/belge ayarları (seçim yokken denetçide)

**Kapsam:** Kök `<svg>`'nin ayarlarını düzenleyebilme.

**Karar / kabul ölçütleri:**

1. **Seçim yokken denetçi = belge kökü.** Önceden hiçbir şey seçili değilken denetçi
   yalnız "bir eleman seçin" mesajı gösterirdi. Artık belge varsa kök `<svg>`'yi konu
   alıp ona uygun alan setlerini gösterir (kullanıcı isteği: seçim yokken tuval ayarları).
2. **`tuval-ayarlari` alan seti** (registry, İlke 5; `uygunMu: etiket==='svg'`): **Ölçü**
   (`width`/`height` — birim içerebilir, metin alanı) ve **Görünüm kutusu** (`viewBox`
   X/Y/En/Boy — sayısal; bir bileşen değişince tümü yeniden yazılır). Metadata alan seti
   (`()=>true`) de kökle eşleştiğinden belge başlığı/açıklaması burada düzenlenir.
   Yazımlar komutla (İlke 2) → undo/redo, tuval canlı güncellenir (İlke 3).

---

## TK-32 — Menü/yaşam döngüsü: Hakkında, Çıkış, macOS pencere-kapanış=çıkış

**Kapsam:** Sürüm bilgisinin yeri, Dosya>Çıkış, macOS kapanış davranışı.

**Karar / kabul ölçütleri:**

1. **Sürüm alt çubuğu kaldırıldı → Yardım › Hakkında.** Ana pencere altındaki sabit
   sürüm çubuğu (`.alt-bar`) kaldırıldı; kabuk grid'i 3 satıra indi. Sürüm (uygulama/
   Electron/Chromium/Node) artık **Yardım › Hakkında** modalında gösterilir. Menü ögesi
   registry'ye kayıtlı (İlke 5); `hakkindaServisi` (singleton) kabuğa "aç" der, kabuk
   modalı çizer (Esc/Enter/perde-tıklama kapatır).
2. **Dosya › Çıkış.** `window.api.pencereKapat()` çağırır → pencere kapanış engelleyicisi
   (TK-27) devreye girer → kaydedilmemiş değişiklik sorulur → onaylanırsa kapanır.
3. **macOS'ta pencere kapanışı = çıkış (kullanıcı isteği).** `window-all-closed` artık
   TÜM platformlarda `app.quit()` çağırır (önceki darwin istisnası + `cikisYapiliyor`
   bayrağı + `activate` yeniden-açma kaldırıldı). Kaydetme sorusu yine kapanış
   engelleyicisinde sorulduğundan veri kaybı olmaz.

---

## TK-33 — Tanımlar paneli: önizleme + düzenleyici + katlama

**Kapsam:** §8.1 kaynak türü deseninin eksik parçaları — kaynakları görsel olarak
göster ve oluşturulanı tasarla/değiştir.

**Karar / kabul ölçütleri:**

1. **Görsel önizleme.** Liste artık id metni yerine (örn. `g-slate`, `arrow`) kaynağın
   küçük **önizlemesini** gösterir: gradyan/desen swatch, marker'lı çizgi, filtreli/
   maskeli/kırpılı örnek şekil, stil sınıflı örnek. Genel `defsOnizleme` kaynağı küçük
   bir `<svg><defs>`'e serileştirip (`dugumSerile`) `url(#id)` ile bir örnek şekille
   kullanır (içe aktarımda sanitize → `unsafeHTML` güvenli).
2. **Tıkla-düzenle.** Bir kaynağa tıklayınca altında **düzenleyicisi** açılır. Gradyan:
   durak rengi/ofseti + ekle/çıkar. Marker: orient/markerWidth/refX… + içerik fill.
   Stil: fill/stroke/opacity (`cssKuralOku/Yaz`+`MetinKomutu`). Filter: ilk primitifin
   stdDeviation/dx/dy/flood-color. Pattern: width/height. Hepsi **komutla** (İlke 2 →
   geri-alınabilir); değişince Tuval + önizleme canlı güncellenir (İlke 3).
   clipPath/mask: bu turda önizleme + "düzenleyici yakında" ipucu.
3. **Katlanabilir gruplar.** Grup başlığına tıklayınca grup katlanır/açılır (görünüm
   durumu, undo'ya girmez).
4. **İlke 1 korunarak.** Çekirdek `KaynakTuru` sözleşmesi (veri/komut) lit'e bağımlı
   OLMAZ; önizleme/düzenleyici (lit şablonu) ayrı bir **renderer** kaydındadır
   (`kaynak-gorunum.ts`: `KaynakGorunum`). Her tür dosyası hem çekirdek türünü hem
   görünümünü kaydeder (İlke 5; kabuk/panel değişmez). Yeni tür = iki kayıt.

---

## TK-25 — Araç çubuğu: tek sütun + kaydırma (yükseklik yetmezse)

**Kapsam:** Pencere kısalınca sol araç çubuğu taşmasın.

**Karar (güncellendi — kullanıcı isteği):** Önce `flex-flow: column wrap` ile 2.
sütuna taşıyordu; bu Tuval'i yatay daralttığından ve istenmediğinden KALDIRILDI.
Artık `araclar-cubugu` **tek sütundur ve sıkışıktır** (buton 32×32, `gap: 2px`).
Yükseklik yetmezse liste **dikey kaydırılır** (`.liste overflow-y:auto`, scrollbar
gizli). Taşma yönünde **alt/üst kaydırma oku** belirir (tıkla → `scrollBy` yumuşak);
fare **tekerleği** de listeyi kaydırır (native `overflow`). Ok görünürlüğü
`ResizeObserver(.liste)` + `@scroll` ile `#okDurum` üzerinden güncellenir (sonsuz
döngü, `ust!==this.ustOk` koruması). Yan etki yok: `.sol` genişliği sabit kaldığından
Tuval daralmaz (eski 2-sütun ödünü ortadan kalktı).

---

## TK-26 — SVG kod paneli: çift-yönlü seçim + geri-alınabilir "Uygula"

**Kapsam:** §11.4 canlı kod paneli olgunlaştı.

**Karar / kabul ölçütleri:**

1. **Tek, YERİNDE düzenlenebilir görünüm** (sonradan birleştirildi). Model, her
   elemanı `data-kimlik`'li `<span>` ağacına çizilir (`kod-goster.ts`); biçim mantığı
   çekirdek dışa aktarıcının yardımcılarıyla paylaşılır (sürüklenmez). `<pre>`
   `contenteditable`'dır → kullanıcı koda doğrudan tıklayıp yazar; "Uygula" (kirliyken
   görünür) `pre.textContent`'i uygular. *Düzeltmeler:* Enter `beforeinput`'ta yakalanıp
   ham `\n` eklenir (contenteditable'ın `<br>`/`<div>` enjeksiyonu `textContent`'i bozardı);
   düzenleme sırasında ağaç YENİDEN ÜRETİLMEZ (Lit aynı memoize TemplateResult'u görüp
   DOM'a dokunmaz → yazılanlar korunur); odaktayken seçili-elemana kaydırma atlanır.
2. **Hover yalnız EN-İÇTEKİ eleman.** İç içe span'larda CSS `:hover` kök svg'yi (tüm
   kodu) vurgulardı; bunun yerine `pointermove`'da `closest('.el')` ile imperatif
   `.vurgu` sınıfı yalnız en-içteki eleman bloğuna eklenir.
2. **Çift-yönlü seçim senkronu.** Tuvalde seçili düğüm(ler) kodda vurgulanır (grup
   seçilince grup); kodda elemana tıklayınca tuvalde seçilir (Shift = çoklu). Kilitli
   düğüm — Katmanlar gibi — buradan seçilebilir.
3. **Perf (inceleme bulgusu).** Kod ağacı yalnız belge İÇERİĞİ değişince yeniden
   üretilir (memoize, `#kodKirli`); seçim değişiminde **yalnız `.secili` sınıfı
   imperatif** güncellenir → büyük belgede tıklama başına O(n) string üretimi yok.
4. **"Uygula" GERİ-ALINABİLİR (İlke 2).** `depo.yukle` (yeni Belge + geçmiş temizler)
   yerine `KodUygulaKomutu`: aynı Belge örneğinde içerik **yerinde** değişir
   (`Belge.icerikDegistir`). Eski kök etiketi/öznitelik/çocukları referansla saklanır;
   `geriAl` onları geri yükler → **ctrl+z koddaki değişikliği geri alır** ve önceki
   komutlar geçmişte geçerli kalır (eski düğüm nesneleri aynı kimlikle döner). Birim
   test: round-trip + önceki-komut-uyumu 14/14.

---

## TK-27 — Kaydedilmemiş değişiklik sorma (Yeni / Aç / Son Dosya / Kapat)

**Kapsam:** Belgeyi terk eden akışlarda veri kaybını önleme.

**Karar / kabul ölçütleri:**

1. **"Değişti" takibi.** `BelgeDeposu.degisti` — bir belge komutu çalışınca
   (`belge.bildir`) true; `yukle`/`kaydedildi()` sıfırlar. (Undo da komuttur →
   sonrası "değişti" kalır; kabul edildi.)
2. **Promise tabanlı modal.** `degisiklikSor` singleton'ı **Kaydet / Kaydetme /
   İptal** sorar; kabuk modalı çizer (Esc=İptal, Enter=Kaydet, perde tıklama=İptal).
   `kaydetmedenDevamMi` Yeni/Aç/Son Dosya akışlarının ön koşuludur; "Kaydet" seçilip
   kaydetme penceresi iptal edilirse akış da iptal olur.
3. **Pencere kapanış onayı (tüm yollar).** Main'de `pencere.on('close')` HER kapanışı
   (özel kapat tuşu, Cmd+W/F4, pencere yöneticisi, Cmd+Q) engeller ve renderer'a
   `pencereKapanisIstegi` yollar; renderer sorar, onaylanırsa `pencereKapatGercek` →
   `pencereyiOnaylayipKapat` (onay bayrağı + `close()`, çıkış zinciri korunur). Renderer
   yıkıldıysa engelleme yapılmaz (asılı kalmaz). Yeni IPC kanalları İlke 4 sözleşmesine
   eklendi.

---

## TK-34 — Denetçide tanım ataması + Geçmiş paneli doldurma + gradyan yönü

**Kapsam:** §9.3 — Tanımlar panelinde **oluşturulan** kaynakları seçili nesneye
**atama** yolu; iki küçük UI düzeltmesi (kullanıcı geri bildirimi: "stillerimiz var
ama hiçbir nesneye atayamıyoruz… atayabileceğimiz ne varsa yapabilelim").

**Karar / kabul ölçütleri:**

1. **"Uygulanan tanımlar" alan seti** (`tanim-alan-seti.ts`, `sira:20`). Atanabilir bir
   nesne (rect/circle/…/path/text/image/use/g) seçiliyken Özellik Denetçisi'nde, belgede
   **tanımlı** kaynaklardan atama yapan alanlar gösterir:
   - **Filtre / Kırpma / Maske** → `<select>` (yok + mevcut id'ler); seçim
     `stilUygulaKomutu(belge, dugum, 'filter'|'clip-path'|'mask', 'url(#id)')` (boş = "yok"
     → özellik kaldırılır). Yazım moduna (TK-18) saygılı.
   - **Stil sınıfları** → tıkla-toggle **çipler** (`.cip`/`.cip.aktif`); nesnenin `class`
     listesine `OznitelikDegistirKomutu` ile ekle/çıkar.
   - Efektif mevcut değer `getComputedStyle` ile okunur (TK-5; inline ya da CSS sınıfı
     farketmez). Atanacak hiçbir tanım yoksa "Tanımlar panelinden oluşturun" ipucu.
   - Marker ataması ayrı alan setindedir (TK-17 uç kutuları); dolgu/kontur gradyanı boya
     seçicidedir — bu alan seti onları **tekrarlamaz**, tamamlar. Hepsi komut (İlke 2).
2. **Gradyan yönü.** `linearGradient` düzenleyicisine **açı (derece)** alanı eklendi
   (`gradyanAci`/`gradyanAciYaz`): açı → `x1/y1/x2/y2` (objectBoundingBox 0–1) tek
   `BilesikKomut`. Kullanıcı artık gradyanın yönünü tayin edebiliyor.
3. **Geçmiş paneli doldurma.** Katmanlar gibi diğer sağ paneller de tüm yüksekliği
   kullanmalı: `gecmis-paneli` `:host`/`.liste` artık `flex:1 1 auto; min-height:0`
   (sabit `max-height:200px` kaldırıldı); başlık `flex:0 0 auto`. Hizalama paneli
   bilinçli kompakt kaldı (araç kutusu).

İlke 1 korunur: çekirdek değişmedi; atama mantığı renderer alan seti kaydıdır (İlke 5,
kabuk/panel değişmez). i18n: `denetci.grup.tanimlar`, `denetci.tanim.*` (tr+en, parity).

---

## TK-35 — Birleşik seçim geçmişi (§9.6 d–g)

**Kapsam:** §9.6 (d–g) — seçim adımlarının düzenleme adımlarıyla TEK ctrl+z/ctrl+y
zincirinde gezilmesi. Daha önce `KomutGecmisi` yalnız belge Command'ları tutuyordu;
seçim geçmişi yoktu (İlke 9 ile çelişiyordu — kullanıcı tespiti).

**Karar / kabul ölçütleri:**

1. **Birleşik zaman çizelgesi.** `KomutGecmisi` iki yığından (`#geri`/`#ileri`) **tek
   `Girdi[]` + tek `#konum`** işaretçisine geçti. `Girdi` ayrık birliği:
   `{tur:'duzenleme', komut}` ya da `{tur:'secim', onceki, sonraki, etiket}` (seçim
   anlık görüntüsü = **kimlik listesi**). `geriAl`/`ileriAl` girdi türüne göre komutu
   uygular/geri alır ya da seçimi (enjekte `#secimUygula`) geri yükler. Genel API
   (`girisler/konum/toplam/konumaGit/calistir/temizle`) korundu → Geçmiş paneli
   değişmedi (seçim adımları da listede görünür, §11.3).
2. **5'lik kayan pencere (e).** `secimAdimiEkle` sonrası `#secimSinirla`: seçim adımı
   sayısı 5'i aşarsa EN ESKİ seçim girdisi `splice` ile düşer; düşen girdi
   uygulanmışsa (`idx < #konum`) `#konum` kayar. Düzenleme adımları sınırsız. Snapshot'lar
   kendinden-yeterli (onceki/sonraki kendi içinde) → ortadan silme kalan girdileri bozmaz.
3. **Erteleme/flush (f) — `SecimGecmisIzleyici` (yeni, çekirdek).** `SecimDeposu`'nu
   izler; `taban` (işlenmiş seçim; ileri yönde DAİMA boş ya da ≥2) + `bekleyen` (henüz
   işlenmemiş TEK seçim) tutar. Geçişler: çoklu→işle (bekleyen varsa önce flush, sonra
   yeni durum); tek→ertele (taban doluysa önce bırakma yaz, sonra bekleyen); boş→bırak
   (bekleyen tek varsa adımsız at, yoksa taban'ı bırak). Navigasyonda `#bastirildi`
   bayrağı yeni kayıt üretmez; `#yenidenHizala` taban/bekleyen'i canlı seçime göre kurar.
4. **Geri dönüş (g).** Bırakma adımının `onceki` anlık görüntüsü, geri-al'da seçimi geri
   getirir; yeni adım gelince redo dalı atılır (`secimAdimiEkle` `#konum`'a kadar truncate).
5. **Kimlik tabanlı, silinmeye dayanıklı.** Snapshot'lar **kimlik[]**; geri yükleme
   `belge.dugumBul(kimlik)` ile çözer (silinmiş düğüm → undefined → filtrelenir, detached
   seçilmez). `icerikDegistir`/yapısal undo'da kimlik kararlı.
6. **İlke 1/9 korunur.** İzleyici + geçmiş ÇEKİRDEKTE, Lit/Electron/DOM'suz. Seçim adımı
   belgeyi DEĞİŞTİRMEZ, belge Command'ı ÜRETMEZ — ayrı bir girdi türü. Etiketler sabit
   Türkçe (mevcut komut etiketleriyle tutarlı; ayrı i18n yok).
7. **Wiring.** Her sekme kendi izleyicisini kurar (`sekme-yoneticisi`); sekme kapanınca
   `birak()`. `KomutGecmisiVekil` yeni public metodları (`secimAdimiEkle`,
   `secimUygulayiciAyarla`) override eder (`vekilTamMi` sessiz).

**Adversaryal denetim düzeltmeleri (çok-ajanlı; gerçek sınıflarla teyit):** İlk sürüm
"düzenleme seçimi değiştirince fazladan seçim adımı" davranışını kabul etmişti; denetim
bunun gerçek bir regresyon olduğunu kanıtladı (çoklu-seçim sil/çoğalt/grupla/çöz = İKİ
ctrl+z). Düzeltildi:
- **A (kritik) — Bastırma.** Düzenleme + onu izleyen seçim güncellemesi TEK eylemdir
  (§9.4). `secimKaydiBastir(fn)` ortam-kapsamı (çekirdek modülü, sayaçlı) eklendi;
  `duzenUygula` ve `sembol yap/genişlet` seçim değişimini bu kapsamda yapar →
  `SecimGecmisIzleyici` adım yazmaz, yalnız `#yenidenHizala` ile durumu hizalar.
- **B (yüksek) — Redo dalı.** Undo sonrası yeni bir seçim (ertelenen tek bile olsa)
  bayat redo dalını atar (`KomutGecmisi.ileriDaliTemizle`; izleyici `ileriAlinabilir`
  iken çağırır) — yoksa ctrl+y terk edilmiş seçimi diriltiyordu (§9.6 g).
- **C (orta) — Navigasyon = işlenmiş.** `#yenidenHizala` artık geri-yüklenen seçimi
  (tek bile olsa) `taban` sayar (committed), `bekleyen` değil → flush'lı tek-eleman
  adımına dönüp uzatınca YİNELENEN adım üretilmez.
- **D (yüksek) — Yazı alanı.** Ctrl+Z/Y/D/G artık input/textarea/contentEditable
  odaktayken yakalanmaz (native metin geri-al çalışır; `uygulama-kabugu`).
- **E/F (düşük).** Çoklu→tek daraltmada "seçim daraltıldı" etiketi; Geçmiş paneli seçim
  adımlarını soluk/italik ayırır (`girisler()` artık `tur` döndürür).

**Test:** `secim-gecmis-izleyici.test.ts` **11/11** (devir izi + erteleme/flush + 5-cap
+ redo-dal-atımı + temizle-sıfırlama + **Bug A bastırma / Bug B redo-at / Bug C yinele-yok**).

---

## TK-36 — macOS doğal menü ve platforma uygun Hakkında ekranı

**Kapsam:** macOS üzerinde uygulama menüsü davranışı ve Hakkında penceresi.

**Karar / kabul ölçütleri:**

1. **macOS'ta doğal menü.** macOS çalışırken hamburger ile açılan özel üst menü
   yerine Electron'un yerel uygulama menüsü kullanılır. Dosya/Düzen/Yol/Belge/Yardım
   eylemleri mevcut `menuKayitDefteri` kayıtlarından beslenmelidir; eylem mantığı
   kopyalanmaz. Windows/Linux'ta mevcut hamburger → menü çubuğu davranışı korunur.
2. **Platform ayrımı görünüm durumudur.** macOS doğal menü tercihi belge modeline
   dokunmaz, Command üretmez ve undo/redo'ya girmez (İlke 9). Menüden tetiklenen
   gerçek düzenlemeler yine mevcut Command akışını kullanır.
3. **Hakkında ekranı platforma uygun olur.** macOS'ta Hakkında bilgisi Electron'un
   yerel About paneli / uygulama menüsü beklentisine uygun görünür. Diğer
   platformlarda mevcut uygulama içi Hakkında modalı kullanılabilir.
4. **Tek kaynak.** Sürüm, Electron/Chromium/Node bilgisi ve uygulama adı tek bir
   servis/sözleşmeden gelir; yerel About paneli ve uygulama içi modal farklı veri
   kaynakları kullanmaz.

---

## TK-37 — Geliştirme adayları yol haritası

**Kapsam:** MVP ve mevcut çekirdek üzerine eklenecek kullanıcı-facing özellikler.
Bu karar, özelliklerin **nereye ait olduğunu**, hangi mevcut altyapıya oturacağını
ve uygulanırken hangi mimari sınırların korunacağını tanımlar. Her aday, başlamadan
önce AGENTS §8.4 kuralıyla tekrar değerlendirilir: mevcut ilkeye/registry'ye mi
oturuyor, yoksa kabuk/sözleşme değişikliği mi istiyor?

**Genel kabul ölçütleri:**

1. Yeni araçlar `aracKayitDefteri` üzerinden, yeni paneller `panelKayitDefteri`
   üzerinden, menü/komut eylemleri `menuKayitDefteri` üzerinden eklenir. Kabuk
   özelliğe özel kod bilmez (İlke 5).
2. Belgeyi değiştiren her işlem tek ya da bileşik **Command** üretir; canlı sürükleme
   ve geçici bindirmeler görünüm durumudur, undo/redo'ya yalnız commit sonucu girer
   (İlke 2 ve 9).
3. Tanım/defs/style tarafına ait her özellik kaynak türü deseniyle ilerler:
   listele, düzenle, uygula, önizle; referans indeksiyle uyumlu olmalıdır (İlke 7).
4. Üretilecek SVG özellikleri Blink destekli listeyle sınırlı kalır; kara listedeki
   yapılar araç ya da tanım olarak sunulmaz (AGENTS §10.10).

**Adaylar / kabul ölçütleri:**

1. **Sembol izolasyon modu.** `<symbol>` ana tanımı yerinde düzenlenebilir olmalı.
   Kullanıcı bir `<use>` örneğinden ana sembol düzenleme moduna girebilir; düzenlenen
   asıl kaynak `<defs>/<symbol>` içindeki düğümlerdir, örnekler canlı olarak güncellenir.
   İzolasyon modu görünüm/çalışma bağlamıdır; sembol içeriğini değiştiren işlemler
   Command'dır. Mevcut "Sembol Yap" ve "Sembolü Genişlet" akışları bozulmaz.

2. **Izgara, cetvel ve kılavuzlar.** Tuvalde ızgara, cetvel ve kullanıcı kılavuzları
   görsel yardımcı olarak gösterilir. Bunların görünürlüğü, aralığı, rengi ve kilit
   durumu görünüm/araç durumudur; belge Command'ı üretmez. Kılavuza/ızgaraya yapışma
   mevcut yapışma altyapısını genişletir; sürükleme sonunda yine tek taşıma Command'ı
   oluşur. Cetvel ve grid zoom/pan ile tutarlı ölçeklenir.

3. **Tuval üstünde gradyan düzenleme.** Gradyan durakları ve doğrusal/radyal kontrol
   hatları doğrudan Tuval üzerinde sürüklenebilir. Bu etkileşim mevcut Tanımlar
   panelindeki gradyan düzenleyicisini tamamlar; aynı kaynak düğümlerini değiştirir.
   Sürükleme sırasında önizleme canlıdır, bırakınca durak/ofset/yön değişikliği tek
   Command veya tek BileşikKomut olur. `gradientUnits` korunur; içe aktarılan
   `userSpaceOnUse` gradyanları objectBoundingBox'a zorla dönüştürülmez.

4. **Hareket yolu aracı.** `animateMotion` için Tuval üzerinde yol çizme ve seçili
   nesneyi o yol üzerinde oynatma desteklenir. Araç birincil üretim aracı olarak
   registry'ye kaydolur; ürettiği animasyon tanımı kaynak/animasyon tarafında
   izlenebilir olmalıdır. Yol çizimi ve animasyon bağlama işlemi Command'dır;
   Zaman Çizelgesi yalnız `Playback` arayüzüyle çalışmaya devam eder.

5. **Zaman çizelgesi olgunlaştırma.** Keyframe düzenleme, easing eğrisi editörü,
   soğan kabuğu ve yol üzerinde canlı önizleme eklenir. Zaman çizelgesi, SMIL/CSS/WAAPI
   ayrıntılarını doğrudan UI kararına dönüştürmez; mevcut `Playback` ve belge/animasyon
   modeli üzerinden konuşur. Keyframe/easing değişiklikleri Command'dır; oynatma
   konumu, onion-skin görünürlüğü ve geçici önizleme görünüm durumudur.

6. **TextPath ve gelişmiş metin.** Yol üzerinde metin (`textPath`), satır aralığı,
   harf aralığı, hizalama, yazı ağırlığı/stili ve seçili metin için gelişmiş denetçi
   alanları eklenir. `textPath` bağlama işlemi, seçili yol ile metin arasında açık
   ve geri-alınabilir bir Command olarak yapılır. SVG fontları üretilmez; sistem/WOFF/
   TTF/OTF font yaklaşımı korunur.

7. **ForeignObject aracı.** `foreignObject` Blink destekli bir birincil yerleştirme
   aracı olarak sunulabilir, ancak güvenlik ve dışa aktarım uyumluluğu açıkça
   sınırlandırılır. İçe aktarım sanitizasyonu korunur; editör aktif betik çalıştırmaz.
   Kullanıcıya bunun geniş uyumluluk profilinde sınırlı veya riskli olabileceği UI'da
   net gösterilir.

8. **Son kullanılan renkler / palet.** Boya seçici son kullanılan düz renkleri ve
   isteğe bağlı belge paletini gösterir. Son kullanılanlar görünüm/tercih durumudur
   ve undo'ya girmez; palet SVG içinde kalıcı bir tanım olarak yazılacaksa bu ayrı
   kaynak/metadata tasarımıyla ve Command ile yapılır. Palet, dolgu/kontur ve gradyan
   durak düzenleme akışlarından ortak kullanılmalıdır.

9. **Yerinde yapıştır ve oran kilidi.** Yapıştırılan nesne imleç/tuval görünümünün
   anlamlı merkezine ya da seçili referansa göre yerleşebilir; işlem belge Command'ı
   olarak geçmişe girer. Boyutlandırmada oran kilidi tutamaç etkileşimine eklenir;
   kilit tercihi araç/görünüm durumudur, sürükleme sonucu tek Command'dır.

10. **Dışa aktarım profillerini görünürleştirme.** "Uygulama-içi / Blink" ve
    "Geniş uyumluluk / temiz SVG" profilleri Dosya/Dışa aktar akışında açık seçenek
    olarak görünür. Seçim yalnız dışa aktarım ayarıdır; doğal kaydetme SVG formatında
    kalır. Geniş uyumluluk profili editör yorumlarını ve destek riski olan yapıları
    temiz/uyumlu biçimde ele alır; uygulama-içi profil editör durumunu korur.

---

## TK-38 — Kod denetimi bulguları: hizalama referansı · atama listesi · gradyan fidelity · Faz F

**Kapsam:** Bağımsız kod denetiminin dört bulgusu (§9.2, §8.1, §8.2, İlke 8).

**Karar / kabul ölçütleri:**

1. **Hizalama referans tercihi (§9.2).** Hizalama artık seçilebilir bir referansa göre
   yapılır: **son seçilene göre** (varsayılan) · **anahtar nesneye göre** (z-üst) ·
   **seçime göre** (toplu kutu) · **belgeye göre** (viewBox/artboard). `hizalaReferans`
   store (görünüm durumu, localStorage; undo'ya girmez); `hizala()` referans kutusuna
   göre kenarları hizalar (dağıtım hariç). Panelde seçici. Önceden yalnız toplu kutu
   kullanılıyordu.
2. **Atama listesi yalnız tanımlı sınıflar.** "Uygulanan tanımlar" alan seti (denetçi)
   artık `tumSiniflar` yerine **stil kaynak türünün** `listele`'sini kullanır → yalnız
   `<style>`'da TANIMLI sınıflar atanabilir görünür (svgtron-stil-* iç/tanımsız sınıflar
   değil). `kaynak-türü registry`'ye `al(id)` eklendi.
3. **Gradyan açı fidelity (İlke 8).** Açı editörü `gradientUnits`'e duyarlı:
   userSpaceOnUse'da mevcut merkez+uzunluk korunur (yalnız döndürülür) → içe aktarılan
   kullanıcı-uzayı gradyanları 0–1'e ezilmez. objectBoundingBox davranışı değişmedi.
4. **Faz F: güvenli yeniden adlandırma + "kullanıldığı yerler" (§8.2).**
   `referans-yeniden-adlandir.ts` (çekirdek): bir kaynağın id'sini/sınıf adını değiştirir
   VE tüm `url(#id)`/`#id`/`class` atıflarını tek BilesikKomut ile günceller (çakışma/
   geçersiz ad reddedilir; `referans-temizle` desenini "değiştir" için yansıtır).
   Tanımlar panelinde seçili kaynağın yönetim alanı: yeniden adlandırma input'u +
   "Kullanıldığı yerler: N" + Seç (kullananları Tuval'de seçer; referans indeksiyle O(1)).

**Test:** `referans-yeniden-adlandir.test.ts` 5/5 (id+atıf, style/href, sınıf, çakışma/
geçersiz, benzer-önek #g1≠#g10). i18n parity 208=208; typecheck/build/smoke temiz.
