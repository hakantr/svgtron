# SVG Editör & Animasyon Gözlemleyici — Başlangıç Prompt'u (Claude Code)

> Bu dosyayı Ajan ile yeni bir proje dizininde başlatırken ilk
> talimat olarak ver. Amaç: **minimal ama çalışan** bir iskelet kurmak; fakat o
> iskeleti, ileride özellik eklerken hiçbir temel parçayı kırmadan büyüyecek
> şekilde tasarlamak.

> **⚠️ PROJE ARTIK KURULU — yeni oturuma/başka makineye başlarken ÖNCE şunları oku:**
> 1. **`GELISTIRME-DURUMU.md`** — güncel uygulama durumu, doğrulama rutini, edinilen
>    teknik dersler/tuzaklar ve **bekleyen iş** (kaldığımız yer). *Devir dosyası.*
> 2. **`TASARIM-KARARLARI.md`** — anlaşılan davranış/UI kararları (TK-1..TK-12).
>
> Bu CLAUDE.md **değişmez kuralları** (mimari ilkeler, sınıflandırma, desteklenen
> özellikler) tanımlar; yukarıdaki iki dosya ise "şu an nerede kaldık ve nasıl
> çalışıyoruz" bilgisini taşır. Üçü birlikte okunmalı.

---

## 1. Bağlam ve hedef

Electron tabanlı bir masaüstü uygulaması geliştiriyoruz: **SVG dosyalarını tam
sadakatle görüntüleyen, animasyonunu (SMIL + CSS/WAAPI) oynatıp kontrol eden ve
düzenlenmesine imkân veren** bir editör.

Electron'u seçmemizin tek sebebi: Chromium'u her platforma (macOS / Linux /
Windows) **kendisi paketlediği için**, SVG render motoru her yerde aynıdır. Yani
bir platformda doğru görünen animasyon, diğerinde de aynı görünür. Sistem
webview'ı kullanan çözümlerin (Tauri, Deno webview) aksine render tutarsızlığı
yaşamayız.

**Bu aşamada "başlangıç seviyesi" demek**: küçük, anlaşılır, tek komutla
çalışan bir uygulama. Ama "önü açık" demek: aşağıdaki **değişmez mimari ilkeler**
ilk commit'ten itibaren yerinde olmalı. Bu ilkeler, sonradan özellik eklerken
yeniden yazım (rewrite) ihtiyacını ortadan kaldıran şeydir.

---

## 2. Değişmez mimari ilkeler (bunlar pazarlık konusu değil)

Bu on ilke, "ilk yapıyı kırmama" garantisinin kalbidir. Her biri ihlal
edildiğinde ileride büyük bir refactor doğurur; o yüzden baştan uygula.

1. **Çekirdek Electron'dan habersizdir.** Render/editör çekirdeği yalnızca web
   platform API'lerine (DOM, SVG, WAAPI) dayanır. Electron'a özgü her şey
   (dosya açma/kaydetme, pencere, menü) bir *adapter arayüzü* arkasındadır.
   Sonuç: çekirdek tarayıcıda da, testte de, ileride başka bir kabukta da
   (Tauri'ye taşımak istersen bile) çalışır.

2. **Her düzenleme bir Command nesnesidir.** `uygula()` / `geriAl()` çiftiyle.
   DOM'a doğrudan, command dışında mutasyon yapmak **yasak**. Bunu baştan
   koyduğumuzda undo/redo, makrolar, betikle otomasyon ve ileride çoklu-kullanıcı
   düzenleme "bedava" gelir.

3. **Tek yönlü veri akışı.** `Komut → Belge (tek doğruluk kaynağı) → Görünümler
   tepki verir`. Görünümler belgeyi *okur*, asla doğrudan değiştirmez; değişiklik
   her zaman bir komutla belgeye gider.

4. **Süreçler arası iletişim tek bir tipli sözleşme üzerinden.** Renderer
   doğrudan `ipcRenderer` çağırmaz; preload'da tanımlı, tiplenmiş tek bir
   `api` yüzeyi vardır. Yeni özellik = bu sözleşmeye yeni kanal eklemek,
   var olanı değiştirmek değil.

5. **Araçlar / paneller / dışa aktarıcılar / kaynak türleri bir kayıt (registry)
   üzerinden eklenir.** Yeni bir araç (seç, düğüm düzenle, çiz...), yeni bir panel
   ya da yeni bir SVG kaynak türü (`filter`, `linearGradient`, `marker`, stil
   sınıfı... ve ileride `radialGradient`, `pattern`, `clipPath`, `mask`,
   `symbol`) eklemek, *kabuk (shell) kodunu* değiştirmemeli; sadece registry'ye
   kayıt olmalı. Bu, "fiş tak-çalıştır" (plugin) mantığının temelidir.

6. **Animasyon oynatma tek bir `Playback` arayüzü arkasındadır.** Timeline UI
   bu arayüzle konuşur; arkasında SMIL (`svg.setCurrentTime`,
   `pauseAnimations`/`unpauseAnimations`) ve WAAPI birlikte yönetilir. UI hangi
   teknolojinin kullanıldığını bilmez.

7. **Yeniden kullanılabilir kaynaklar belge modelinin yapısal parçasıdır ve bir
   referans indeksiyle izlenir.** `<defs>` içindeki tanımlar (filter, gradient,
   marker...) ve `<style>` içindeki sınıflar ham DOM olarak değil, belge
   modelinde *yapısal* olarak tutulur. Ayrıca "hangi şekil hangi kaynağı
   kullanıyor" sorusunu O(1) yanıtlayan bir **referans indeksi** baştan kurulur.
   Bu indeks olmadan; yeniden adlandırma, silme, "kullanıldığı yerler" listesi ve
   canlı önizlemenin doğru tetiklenmesi sonradan ağrılı refactor'a döner.

8. **Belge modeli sürümden bağımsızdır; içe aktarım liberal, dışa aktarım
   profillidir** (dayanıklılık ilkesi: *kabul ederken esnek, üretirken tutucu*).
   İç model ne "SVG 1.1" ne "SVG 2"dir; soyut, normalize bir temsildir (şekiller,
   paint server'lar, filtreler, animasyonlar, stiller).
   - *İçe aktarıcı (okuma)* her şeyi kabul eder — SVG 1.1, SVG 2 ve kaldırılmış
     yapılar (`tref`, `animateColor`, SVG fontları) — ve modele normalize eder.
     **Geriye uyum yalnızca okuma içindir.**
   - *Dışa aktarıcı (yazma)* tek sabit sürüme değil, export anında seçilen bir
     **profile** göre yazar: "Uygulama-içi / Blink" (en modern, en kısa) ya da
     "Geniş uyumluluk" (Safari dahil her yerde render olan güvenli alt küme).
   Böylece "1.1 mi 2 mi" sorusu temel bir mimari çatal değil, bir dışa-aktarım
   ayarı olur. Üretilebilir özellik kümesinin tavanı **SVG 2 spec'i değil,
   Blink'in fiilen uyguladığı kümedir**; hiçbir motorda render olmayan SVG 2
   yapıları (mesh, hatch, solidColor) hiçbir zaman üretilmez (bkz. 10. bölüm).

9. **Belge durumu ile görünüm durumu ayrıdır; ikisi farklı geçmiş kurallarına
   tabidir.** *Belge durumu* (şekiller, konum, boyut, dönüş, sıralama/katman,
   uygulanan tanımlar...) Command'a tabidir ve undo/redo'ya tam girer. *Görünüm
   durumu* belgeyi değiştirmez ve **belge Command'ı üretmez**; çoğu (yakınlaştırma/
   kaydırma, menü açık/kapalı, vurgulama, tutamaçlar) undo'ya **hiç** girmez. Tek
   istisna **seçim**dir: seçim de belgeyi değiştirmez, ama kendi **sınırlı seçim
   geçmişi**yle undo/redo'ya katılır (bkz. 9.6). Bu ayrım baştan konmazsa "geri al"
   tuşu; yakınlaştırmayı ya da menü açmayı geri almaya başlar — klasik ve
   düzeltmesi pahalı bir hata.

10. **Uygulamanın kendine ait bir dosya formatı yoktur; tek doğal format SVG'dir.**
    Çıktı her zaman geçerli, taşınabilir SVG'dir. Uygulamaya özgü kontrol bilgileri
    (kilit durumu gibi) ne ayrı bir formatta ne de render'ı etkileyen özel
    attribute'larda; **ilgili nesnenin hemen üstündeki bir SVG yorum satırı**
    (`<!-- ... -->`) içinde, uygulamanın ayrıştırabileceği sabit bir biçimde saklanır.
    - **Yorumlar tüm SVG motorlarınca yok sayılır** → dosya her yerde aynı render
      olur; "tam SVG uyumu" bozulmaz.
    - Yorumun kendine ait, ayırt edici bir **işareti/öneki** olmalı (kullanıcının
      kendi yorumlarıyla karışmasın); ilişki, yorumu izleyen ilk öğeyle (bitişiklik)
      kurulur — sağlamlık için nesnenin `id`'si de yoruma yazılabilir.
    - *İçe aktarımda (liberal, 8. ilke):* bu yorumlar varsa okunup kontrol durumu
      geri yüklenir; yoksa (başka araçtan gelen dosya) durum varsayılanına döner
      (örn. kilit kapalı).
    - *Dışa aktarımda (profilli, 8. ilke):* uygulama profilinde yorumlar yazılır;
      "temiz / geniş uyumluluk" profilinde ayıklanabilir (zararsızdır, sadece gürültü).
    - İleride *çizim* başka formatlara (PNG, PDF...) aktarılabilir; ama bu "kaydetme"
      değil **dışa aktarımdır** — uygulamanın native durumu yalnız SVG'de yaşar.

---

## 3. Teknik kararlar

- **Dil:** TypeScript (her üç süreçte de). `strict: true`.
- **Build aracı:** `electron-vite` (main / preload / renderer üçlüsünü tek
  konfigürasyonla, hızlı HMR ile yönetir). Webpack ile uğraşmaya gerek yok.
- **Güvenlik modeli (zorunlu):**
  - `contextIsolation: true`
  - `nodeIntegration: false`
  - mümkün olan yerde `sandbox: true`
  - renderer'a Node erişimi yok; tüm yetenekler preload'daki dar, tiplenmiş
    `contextBridge` API'siyle açılır.
- **UI:** İlk aşamada framework şart değil; sade TypeScript + Web Components ya da
  hafif bir reaktif katman yeterli. Ama seçimi 2. ilkeyi (tek yönlü akış)
  bozmayacak şekilde yap. Eğer framework eklenecekse gerekçesini açıkla.
- **Yorumlar ve dokümantasyon Türkçe.** Electron'un zorunlu kıldığı isimler
  (`main`, `preload`, `renderer`) İngilizce kalır; uygulamaya ait modül/özellik
  isimlerini Türkçe verebilirsin (proje dilim Türkçe).
- **i18n anahtar dosyası `tr.dil`'dir (tek doğruluk kaynağı).** Dil katalogları
  `src/renderer/diller/*.dil` altında; her yeni anahtar ÖNCE `tr.dil`'e eklenir,
  sonra diğer dillere (örn. `en.dil`) taşınır. İki dosya arasında **anahtar kümesi
  ya da yer tutucu farkı** olursa **`tr.dil` daima doğru kabul edilir**; diğer
  diller ona göre düzeltilir (eksik/fazla anahtar `tr.dil`'e hizalanır, `{ad}`
  gibi yer tutucular `tr.dil`'dekiyle birebir aynı olmalıdır). Çalışma anında
  eksik çeviri zaten Türkçe'ye, o da yoksa anahtarın kendisine düşer.

---

## 4. Hedef dizin yapısı (özellik-klasörü mantığı)

Yeni özellik eklemek = yeni bir klasör açıp registry'ye kaydetmek demek olmalı.
Aşağıdaki yapı buna hizmet eder:

```
src/
  main/                 # Electron ana süreç (Node): pencere, menü, dosya G/Ç
    index.ts
    pencere.ts
    dosya-servisi.ts    # fs işleri burada; renderer asla fs görmez
  preload/
    kopru.ts            # tek tipli `api` yüzeyi (contextBridge)
  ortak/                # her iki sürecin paylaştığı tipler/sözleşmeler
    api-sozlesmesi.ts   # IPC kanallarının tip tanımları (tek kaynak)
  cekirdek/             # ELECTRON'DAN HABERSİZ çekirdek
    belge/              # SVG belge modeli (tek doğruluk kaynağı)
      tanimlar/         # <defs> + <style> yapısal modeli + referans indeksi
    komutlar/           # Command altyapısı + tarih (undo/redo)
    animasyon/          # Playback arayüzü (SMIL + WAAPI)
    registry/           # araç/panel/dışa-aktarıcı/kaynak-türü kayıtları
  renderer/             # UI kabuğu
    kabuk/              # boş çatı: ÜST ÇUBUK + menü (görünüm durumu) + bölgeler; paneller registry'den dolar
    tuval/              # ANA ÇALIŞMA ALANI: render + canlı animasyon + seçim/tutamaç/taşıma/boyutlandırma/döndürme
    araclar/            # SOL araç çubuğu: birincil nesne üretim araçları
      tools/            # her araç bir kayıt: seç/düğüm/dikdörtgen/daire/elips/çizgi/yol/metin...
    ozellikler/         # sağ panel bölgeleri; her biri kapalı, registry'ye kaydolur
      zaman-cizelgesi/  # ALT: play/pause/seek (Playback arayüzü)
      katmanlar/        # nesne/grup ağacı + z-sıralama + görünürlük/kilit
      ozellik-denetcisi/# SAĞ-ÜST, SEÇİME DUYARLI: seçili nesnenin türüne göre alanlar
        turler/         # şekil/ metin/ grup/ ... her nesne türü için alan seti kaydı
      tanimlar-paneli/  # SAĞ açılır/gizlenir: "Tanımlar ve Ek Özellikler" kütüphanesi
        turler/         # her kaynak türü: liste + editör + uygulama stratejisi
                        #   filtre/ gradyan/ marker/ stil/ kirpma-maske/ animasyon/ yapi/ ...
```

---

## 5. İlk teslimat (MVP kapsamı)

Bu kadarını çalışır halde getir, **fazlasını değil**:

1. Pencere açılır; bir SVG dosyası seçtirir (main süreçteki dosya servisi
   üzerinden, preload köprüsüyle).
2. Seçilen SVG, `tuval` (ana çalışma alanı) içinde tam render edilir.
3. `zaman-cizelgesi`: **oynat / duraklat / başa sar** ve bir konum
   kaydırıcısı (`Playback` arayüzü üzerinden, SMIL `setCurrentTime` ile).
4. `ozellik-denetcisi`: seçili elemanın bir-iki alanını (örn. `fill`,
   `opacity`) **türüne duyarlı** gösterir ve **bir Command aracılığıyla**
   değiştirir — böylece undo/redo iskeleti ilk günden çalışır (en az bir adım
   geri al).

Bu dört madde, temel mimari ilkeleri en az bir kez kullanır. Yani iskeletin
"büyümeye hazır" olduğu, en baştan kanıtlanmış olur.

---

## 6. Yapma / etme kuralları

- Renderer içinde `require('fs')`, `require('electron')` **kullanma** — her şey
  preload köprüsünden geçer.
- DOM'u command dışında doğrudan değiştiren kod **yazma**.
- Özelliğe özel kodu kabuğa (shell) **gömme** — registry'ye kaydet.
- Değer/string'leri sabit-kodlama (hardcode) yerine, ileride çoğalacak şeyleri
  (araç listesi, panel listesi, desteklenen attribute'lar) registry/konfig
  üzerinden ver.
- Büyük bir bağımlılık eklemeden önce **dur ve gerekçesini sun**.

---

## 7. Senden ilk istediğim

1. Önce yukarıdaki yapıyı ve ilkeleri **kendi cümlelerinle özetle** ve varsa
   bir-iki tasarım kararını (örn. UI katmanı seçimi) bana sorarak netleştir.
2. Sonra `electron-vite` ile **minimum çalışan iskeleti** kur: boş pencere +
   güvenli preload köprüsü + ortak tip sözleşmesi.
3. Ardından 5. bölümdeki MVP'yi adım adım ekle; her adımda hangi ilkeyi nasıl
   karşıladığını kısaca belirt.
4. Her commit küçük ve odaklı olsun; çalışmayan ara durum bırakma.
5. **8. bölümdeki kaynak (defs/style) yol haritasını şimdi uygulama.** Sadece
   MVP'nin zeminini, o yol haritası "yeni dosya ekle + registry'ye kaydol"
   seviyesinde dahil edilebilecek şekilde hazırla: belge modelinde tanımlar için
   yapısal yer aç, referans indeksini (7. ilke) en baştan kur, sağ panel ve
   kaynak-türü registry'sini boş da olsa devreye al. Yani MVP küçük kalır ama
   8. bölümün üstüne oturacağı zemin hazır olur.
6. Hangi SVG özelliğinin **Tuval'de bir araç** mı yoksa **sağ paneldeki bir
   tanım/ek özellik** mi olduğunu 9. bölümdeki sınıflandırmaya göre belirle.
   Editörün *üretebileceği* özellik kümesini 10. bölümdeki **Blink destekli
   liste** ile sınırla; o listede olmayanı (mesh, hatch, SVG-font...) kullanıcıya
   araç ya da tanım olarak sunma.

Tüm açıklamalarını Türkçe yap.

---

## 8. Genişleme alanı: Tanımlar (defs/style) ve kaynak yönetimi

Burası uygulamanın asıl gücünün biriktiği yer. Dikkat: aşağıdaki ihtiyaçların
hepsi **aynı problemin tekrarı**dır — "yeniden kullanılabilir bir kaynağı
*listele → seç → düzenle → canlı izle → şekle uygula*." O yüzden bunları ayrı
ayrı özellik olarak değil, **tek bir 'kaynak türü' (resource type) deseni**
olarak inşa edeceğiz. Yeni bir SVG kavramı (örn. `radialGradient`, `pattern`)
geldiğinde panel baştan yazılmaz; sadece yeni bir tür kaydı eklenir.

### 8.1. Kaynak türü sözleşmesi (tek desen, çok tür)

Sağ paneldeki her grup, registry'ye kayıtlı bir **kaynak türü** tarafından
sürülür. Her tür şu dört şeyi sağlar — fazlasını değil:

- **listele:** Belge modelindeki o türden kaynakları (id/ad + küçük önizleme ile)
  gruplu olarak verir. (örn. tüm `filter`'lar, tüm `linearGradient`'ler...)
- **düzenleyici:** Seçili kaynağı düzenleyen alan (parametreler / alt düğümler).
  Düzenleme **doğrudan değil, Command ile** belgeye yazılır (2. ilke).
- **uygulama stratejisi:** Kaynağın bir şekle nasıl iliştirildiği. Bu nokta
  türden türe değişir ve deseni esnek tutan şeydir:
  - `filter`   → şeklin `filter="url(#id)"` attribute'u
  - `gradient` → şeklin `fill` / `stroke` değeri `url(#id)`
  - `marker`   → `marker-start` / `marker-mid` / `marker-end`
  - `stil`     → şeklin `class` listesine sınıf ekle/çıkar (url() değil!)
- **canlı önizleme:** Ayrı bir iş değildir; 3. ilke (tek yönlü akış) sayesinde
  komut belgeyi değiştirince hem çalışma alanı hem düzenleyici otomatik tepki
  verir. Tür sadece "neyin değiştiğini" bildirir.

Bu sözleşme yerinde olduğunda, "yeni tür eklemek" = bu dört fonksiyonu yazıp
registry'ye kaydetmek demektir. Kabuk, sağ panel ve uygulama akışı hiç
değişmez.

### 8.2. Referans bütünlüğü (7. ilkenin pratiği)

Kaynaklar `url(#id)` ya da sınıf adıyla atıf alır. O yüzden referans indeksi
şunları ucuzlatır ve bunlar baştan tasarlanmalı:

- Bir kaynağın **"kullanıldığı yerler"** listesini gösterme.
- Yeniden adlandırma → tüm atıfların (`url(#eski)`, `class="eski"`) güncellenmesi
  (tek Command içinde).
- Silme → atıfı olan şekiller varsa uyarma / temizleme seçeneği.
- Canlı önizlemenin yalnızca etkilenen şekillerde tetiklenmesi.

### 8.3. Adım adım yol haritası (MVP'nin ÜSTÜNE, sırayla)

Her faz öncekini bozmadan, çoğu zaman "yeni dosya + registry kaydı" olarak
gelir. Sıra önemli: önce zemin, sonra ilk tür uçtan uca, sonra diğerleri ucuza.

- **Faz A — Belge zemini.** `<defs>` ve `<style>`'ı belge modeline *yapısal*
  olarak ayrıştır; referans indeksini kur. (Görünür UI yok ya da çok az.) Bu,
  her şeyin üstünde duracağı temeldir.
- **Faz B — Başlık/metadata.** En küçük kullanıcı kazancı: kök `<title>` (ve
  eleman düzeyinde `<title>`/`<desc>`) düzenleme — Command ile. Metadata düzenleme
  yolunu kanıtlar.
- **Faz C — Sağ panel iskeleti + İLK tür: `filter`.** Sağ paneli registry-sürümlü
  boş çatı olarak kur ve **tek bir türü uçtan uca** bitir: filter'ları listele,
  seç, düzenle, canlı izle, oluştur/sil, şekle uygula. Bu faz "kaynak türü
  deseni"ni kanıtlar; en kritik faz budur.
- **Faz D — `linearGradient` ve `marker`.** Desen kanıtlandığı için bunlar
  "yeni tür kaydı"dır, yeniden yazım değil. Her biri sadece kendi dört
  fonksiyonunu (listele/düzenle/uygula/önizle) getirir.
- **Faz E — `<style>` / CSS sınıfları grubu.** `.bg .title .sub .api .body .when
  .step .chip ...` gibi sınıfları ayrı grup olarak listele; bildirimlerini
  düzenle; şekillere sınıf ekle/çıkar. Burada uygulama stratejisi farklıdır
  (`url()` değil, `class`) — desenin bu esnekliği zaten karşıladığını gösterir.
- **Faz F — Uygulama/atama akışını genelleştir + referans yönetimi.** "Seçili
  kaynağı seçili şekle/şekillere uygula" tek, registry-sürümlü bir akış olur;
  "kullanıldığı yerler", güvenli yeniden adlandırma/silme devreye girer.
- **Faz G+ — Tak-çalıştır yeni türler.** `radialGradient`, `pattern`, `clipPath`,
  `mask`, `symbol`... her biri yalnızca yeni bir registry kaydıdır.

### 8.4. Bu fazları planlarken uyulacak kural

Her faza başlamadan önce: "Bu özellik mevcut bir ilkeyi mi kullanıyor, yoksa
kabuğu/paneli/sözleşmeyi değiştirmem mi gerekiyor?" diye sor. Cevap ikincisiyse
**dur ve bana danış** — çünkü o, zeminin bir yerde eksik tasarlandığının
işaretidir ve düzeltilmesi gereken yer özellik değil, zemindir.

---

## 9. Arayüz bölgeleri ve nesne sınıflandırması

Editör iki tür "şey"le çalışır; bunları **asla karıştırma** — yerleri ve üretim
yolları farklıdır:

- **Birincil nesneler** — Tuval'de doğrudan *çizilen/yerleştirilen*, geometrisi
  ve konumu olan şeyler. Üretim yolu: **Araçlar**.
- **Uygulanan / tanımlanan özellikler** — Tuval'de tek başına çizilmeyen; ya bir
  *tanım* (defs) olarak tanımlanıp nesnelere *uygulanan*, ya da seçili nesneye
  bir *özellik* olarak atanan şeyler. Yeri: **sağ panel**.

**Sınıflandırma kuralı** (yeni bir SVG özelliği eklerken sor): *"Bu, tuvale
çizilen bir nesne mi, yoksa bir nesneye uygulanan/tanımlanan bir şey mi?"*
Cevaba göre yeri kendiliğinden belli olur. Bu kural, 5. ilkenin (registry) ve
8. bölümün (kaynak deseni) doğal devamıdır.

### 9.1. Arayüz bölgeleri (Türkçe adlar)

| Bölge | Türkçe ad | İçerik |
|---|---|---|
| Top bar | **Üst Çubuk** | Hamburger + "SVG Editör" + dosya adı ⇄ menü çubuğu (bkz. 9.5) |
| Canvas | **Tuval** | Ana çalışma alanı: render + canlı animasyon + seçim/dönüştürme |
| Toolbar | **Araçlar** | Birincil nesne üretim araçları (sol) |
| Layers | **Katmanlar** | Nesne/grup ağacı + z-sıralama + görünürlük/kilit |
| Inspector | **Özellik Denetçisi** | Seçime duyarlı: seçili nesnenin türüne göre alanlar (sağ-üst) |
| Library | **Tanımlar ve Ek Özellikler** | Açılır/gizlenir kütüphane: defs/animasyon/filtre... (sağ) |
| Timeline | **Zaman Çizelgesi** | Oynat/duraklat/sar (alt) |

### 9.2. Araçlar (Tuval'de doğrudan üretilen birincil nesneler)

Her araç registry'ye kayıtlıdır (5. ilke); yeni araç = yeni kayıt, kabuk
değişmez. Hedeflenen araç seti (Türkçe ad / parantezde SVG–işlev karşılığı):

**Seçim ve düzenleme**
- **Seç** — taşı / boyutlandır / döndür (9.4–9.8'deki tüm seçim mantığı bunun altında)
- **Düğüm** — `path` düğümleri ve Bézier tutamaçları; düğüm ekle/çıkar
- **Şekil Oluşturucu** (Shape Builder) — üst üste binen şekilleri sürükleyerek birleştir/böl
- **Grup-içi Seç** (Doğrudan / İzolasyon) — gruba girmeden içindeki tek nesneyi seç
- **Kement** — serbest çizilen alanla seçim (dikdörtgen kement yerine)

**Çizim**
- **Kalem** — hassas Bézier yol (`path`)
- **Kurşun Kalem** — serbest çizim, otomatik düğüme dönüştür (`path`)
- **Dikdörtgen** (`rect`) · **Elips/Daire** (`ellipse`/`circle`) · **Çizgi** (`line`) ·
  **Çoklu Çizgi** (`polyline`) · **Çokgen** (`polygon`) · **Yıldız** · **Spiral**
- **Metin** (`text`/`tspan`) · **Yol Üzerinde Metin** (`textPath`)
- **Görsel Yerleştir** (`image`) · **Gömülü HTML** (`foreignObject`)

**Boyama ve dönüştürme**
- **Gradyan** — gradyan duraklarını tuval üzerinde sürükle
- **Pipet** — sahnedeki bir renkten dolgu/kontur al
- **Dönüştür** — serbest ölçek / eğme / döndür · **Yansıt** — aynala

**Animasyon (bu editöre özel)**
- **Hareket Yolu** — `animateMotion` için tuvale yol çiz, nesneyi üzerinde oynat

**Görünüm (görünüm durumu — 9. ilke, undo'ya girmez)**
- **Yakınlaştırma** · **El** (kaydır)

**İşlem aracı**
- **Hizalama** — seçili nesneleri hizala/dağıt (referans tercihiyle, bkz. altta)

**Hizalama (Araçlar içinde):** Seçili nesneleri hizalar/dağıtır — yatay
(sol / merkez / sağ), dikey (üst / orta / alt) ve eşit dağıtım. Hizalama nesneleri
taşıdığı için bir *belge durumu* değişikliğidir → tek bir **Command**'dır
(2. + 9. ilke), geri alınır.

Hizalamanın **neye göre** yapılacağı, seçilebilir bir **referans tercihidir**
(araç durumu; görünüm durumudur, undo'ya girmez, oturumlar arası korunabilir):

- **Son seçilene göre** — referans, seçime en son eklenen nesnedir. **(VARSAYILAN.)**
- **Anahtar nesneye göre** — referans, katman (z-sıralama) yapısında **en üstteki**
  nesnedir.
- **Seçime göre** — referans, seçili nesnelerin toplu sınırlayıcı kutusudur.
- **Belgeye göre** — referans, belgenin/tuvalin sınırlarıdır (`viewBox` / artboard).

Varsayılan "son seçilene göre"dir; kullanıcı bu tercihi her an değiştirebilir.
Tercih yalnızca referansı belirler; hizalamanın sonucu yine tek bir Command
olarak commit edilir.

### 9.3. Özellik Denetçisi (seçime duyarlı)

Bu bir nesne türü değil, bir **davranış**tır: Tuval'de ne seçildiyse, onun
türüne uygun alan setini gösterir. Her nesne türü için bir "alan seti"
registry'ye kaydedilir (yeni tür = yeni alan seti kaydı). Örnekler:

- **Temel Şekil seçili:** geometri (konum modeli x/y · sx/sy · tx/ty → bkz. 9.8;
  türüne göre `x/y`, `cx/cy`, `r`, `rx/ry`,
  `width/height`, `points`, `d`); dolgu; kontur (renk / kalınlık / kesik / uç);
  opaklık; dönüşüm; ve seçili nesneye **uygulanmış tanımların** (filtre / maske /
  marker / gradyan / stil) kısayolları.
- **Metin seçili:** yazı tipi, boyut, ağırlık, stil, hizalama, satır/harf
  aralığı, `textPath` bağlama, dolgu/kontur.
- **Grup (`g`) seçili:** ortak dönüşüm, opaklık, gruba uygulanmış tanımlar.

Buradaki her değişiklik de **doğrudan değil, Command ile** yazılır (2. ilke);
böylece geri-alınabilir ve Tuval canlı güncellenir (3. ilke).

### 9.4. Tuval etkileşimi: seçim, dönüştürme, katmanlar

- **Seçim (görünüm durumu; belgeyi değiştirmez ama sınırlı seçim geçmişine girer — bkz. 9.6, 9.7):** Tuval'de bir nesneye
  tıklayınca seçilir; seçili nesnenin üzerinde bir **seçim çerçevesi**, köşe/kenar
  **boyutlandırma tutamaçları** ve bir **döndürme tutamağı** belirir. Boş alana
  basıp sürükleyerek seçim dikdörtgeni ve çoklu seçim desteklenir.
- **Doğrudan manipülasyon (belge durumu — hepsi Command, undo'ya girer):**
  - **Taşıma:** Nesneye basılı tutup sürükleyince taşınır.
  - **Boyutlandırma:** Tutamaçlardan sürükleyince boyut/ölçek değişir.
  - **Döndürme:** Döndürme tutamağından döndürülür.
- **Sürükleme commit kuralı:** Sürükleme *sırasında* Tuval canlı önizleme gösterir
  (bu ara hal görünüm durumudur); fare *bırakıldığında* **tek bir Command** commit
  edilir. Yani bir sürükleme = tek bir geri-al adımı; ara karelerle undo yığını
  kirletilmez.
- **Katman (Layer) yönetimi:** **Katmanlar** paneli nesne/grup ağacını ve
  z-sıralamasını gösterir; öne/arkaya getir, görünürlük (göster/gizle), kilitle
  işlemleri sunar. Sıralama ve görünürlük *belge durumudur* → her biri Command'dır.
  Kilit, nesneyi yanlışlıkla taşımaktan/seçmekten korur; tam tanımı 9.7'dedir.

### 9.5. Üst Çubuk ve menü davranışı (hamburger → menü çubuğu)

Üst Çubuk iki mod arasında geçer. Bu geçiş tamamen **görünüm durumudur**
(9. ilke): undo'ya girmez, belge modeline dokunmaz.

- **Toplu mod (varsayılan):** Üst Çubukta soldan sağa: **☰ hamburger** ·
  **"SVG Editör"** · **açık dosya adı**.
- **Menü modu:** Hamburger'a tıklanınca hamburger bir alt-menü *açmaz*; bunun
  yerine **hamburger, "SVG Editör" ve dosya adı gizlenir** ve aynı konumdan
  itibaren yatay menü çubuğu açılır: **Dosya · Düzen · …**
- **Toplu moda geri dönüş** — şu üç durumdan herhangi biri menüyü kapatır ve
  hamburger + "SVG Editör" + dosya adını geri getirir:
  1. bir menü öğesi seçilince,
  2. menü/çubuk dışına tıklanınca,
  3. **Esc**'e basılınca.

Menüler (Dosya, Düzen…) ve altlarındaki eylemler de registry'ye kayıtlıdır
(5. ilke): yeni menü/eylem eklemek kabuğu değiştirmeden yapılır. Menünün
açılıp kapanması görünüm durumu olduğundan undo'ya girmez; ama menüden
tetiklenen gerçek düzenlemeler (geri-al/yinele gibi geçmiş işlemleri hariç)
Command üretir.

### 9.6. Gelişmiş seçim modeli ve seçim geçmişi

Seçim belgeyi değiştirmez (9. ilke), ama kendi **sınırlı geçmişi**yle undo/redo'ya
katılır. Kurallar:

**(a) Referans nesnenin görsel ayrımı.** Birden fazla nesne seçiliyken, etkin
hizalama referansı tek bir nesneyse (mod "son seçilene göre" ya da "anahtar
nesneye göre" ise), o referans nesne diğerlerinden **farklı işaretlenir** — daha
aydınlık ya da daha kalın çerçeveyle — ki kullanıcı referansı görsün. ("seçime
göre" / "belgeye göre" modlarında tek nesne referans olmadığından, isteğe bağlı
yalnızca referans çerçevesi/artboard gösterilir.)

**(b) Seçili nesneye tıklayarak referans atama.** Çoklu seçim aktifken, seçili
nesnelerden birine **değiştirici tuş olmadan** (ctrl/shift/alt yok) tıklamak
seçimi *bozmaz*; o nesneyi **etkin referans (son seçilen / anahtar)** yapar ve
işareti ona taşır.
- Örnek: shift ile sırasıyla a, c, e, g, b seçili (son seçilen = b). Değiştirici
  olmadan c'ye tıklanırsa seçim {a, c, e, g, b} korunur ama son seçilen artık c
  olur. Bu, hizalama referansını da c'ye taşır.

**(c) Seçili olmayan nesneye / boşluğa tıklama.** Değiştirici olmadan **seçili
olmayan** bir nesneye tıklamak mevcut seçimi serbest bırakıp yalnız o nesneyi
seçer; boşluğa tıklamak seçimi tümden serbest bırakır.
- Örnek: yukarıdaki seçimdeyken d'ye tıklanırsa {a, c, e, g, b} bırakılır, yalnız
  d seçili olur.

**(d) Tek geçmiş, iki giriş türü.** Undo geçmişi iki tür giriş tutar: **düzenleme
adımı** (belge Command'ı, 2. ilke) ve **seçim adımı** (belgeyi değiştirmeyen seçim
anlık görüntüsü). ctrl+z / ctrl+y (geri/ileri) bu birleşik geçmişte gezer; bir
seçim adımına gelince önceki seçimi geri getirir, bir düzenleme adımına gelince
düzenlemeyi geri alır.

**(e) Seçim adımları en çok 5 ile sınırlı (kayan pencere).** Geçmişteki seçim
adımları (seçme **ve** bırakma) yalnızca **5 en yeni** olanı tutar; yeni bir seçim
adımı gelip 5 aşılırsa **en eski seçim adımı** atılır. Düzenleme adımları bu sınıra
dahil değildir (normal belge geçmişine tabidir). Amaç: seçim, geçmişi gereksiz
şişirmesin.

**(f) Tek nesne seçimi ertelenir ("bekleyen").** Tek bir nesnenin seçilmesi
geçmişe **hemen** yazılmaz; kuyruk bekler. Bir tek-seçimi başka bir tek-seçimle
değiştirmek de adım yazmaz (yalnız bekleyen durum güncellenir). Tek seçim, ancak
**çoklu seçime dönüştüğünde** geçmişe yazılır: o an bekleyen tek seçim *flush*
edilip kaydedilir, ardından yeni eklenen nesne de kaydedilir.

**(g) ctrl+z ile seçime dönüş.** Bir seçim serbest bırakıldıktan sonra ctrl+z son
bırakılan seçili nesneleri yeniden seçer; ctrl+y ileri gider. (Undo'dan sonra yeni
bir adım gelirse ileri/redo dalı, standart davranışla, atılır.)

**Birleşik örnek (kuralların tam izi):**

Başlangıç geçmişi:

| Adım | Olay | Tür |
|---|---|---|
| 1 | "a" yazıldı | düzenleme |
| 2 | "b" silindi | düzenleme |
| 3 | a seçildi | seçim |
| 4 | c seçildi | seçim |
| 5 | e seçildi | seçim |
| 6 | g seçildi | seçim |
| 7 | b seçildi | seçim |

- **f seçilince** seçim adımı sayısı 5'i aşar → en eski seçim adımı ("a seçildi")
  atılır, numaralar kayar: 3=c, 4=e, 5=g, 6=b, 7=f. (Düzenleme adımları 1–2
  korunur — kural (e).)
- **Daireye (seçili değil) tıklanınca:** adım 8 = "{a,c,e,g,b,f} serbest
  bırakıldı" (kaydedilir); daire tek seçim olur → **kaydedilmez**, kuyruk bekler.
  Sonraki adım yine tek seçimse yine bekler — kural (f).
- **Shift ile a'ya tıklanınca** (çoklu seçim olur): bekleyen "daire" flush edilir
  → adım 9 = "daire seçildi"; adım 10 = "a seçildi".
- **Boşluğa tıklanınca:** adım 11 = "{daire, a} serbest bırakıldı".
- **Bu noktada ctrl+z:** {daire, a} yeniden seçilir — kural (g).

### 9.7. Nesne kilidi ve alan (kement) seçimi + değiştirici tuşlar

**Nesne kilidi.** Bir nesne **kilitlenebilir**; kilitli nesne Tuval'de **taşınamaz,
boyutlandırılamaz, döndürülemez ve alan seçimiyle seçilmez** (üzerinden geçilse
bile).
- *Amaç:* Şeffaf olmayan bir **zemin/arka plan** nesnesini (amblem için şeffaf zemin
  isteriz, ama dolu zeminli görsellerde arka plan gerekir) yanlışlıkla
  taşımaktan/boyutlandırmaktan korumak. Ayrıca zemin üstündeki nesneleri kement'le
  seçerken, tıklama zeminin üzerinde başladığı için zeminin taşınmasını önlemek —
  zemin kilitliyse o basış kement seçimi başlatır, taşıma değil.
- Kilit, belge modelinde **nesne başına bir editör bayrağı**dır; **Command** ile
  açılır/kapanır (geri alınır). Kalıcılığı **10. ilkeye göre**, nesnenin **hemen
  üstüne yazılan bir SVG yorum satırı**yla sağlanır (örn. `<!-- @editor lock=true -->`)
  — böylece zemin yeniden açıldığında kilitli kalır, ama dosya saf/taşınabilir SVG
  olarak durur.
- Kilitli nesne Tuval'den seçilemediği için, kilidini açmak üzere **Katmanlar
  panelinden** seçilebilir.

**Tıkla-vs-sürükle ayrımı.** Bir nesnenin **tıklamayla** seçilebilmesi için, tıklama
o nesne **üzerinde başlamış ve yine o nesne üzerinde bırakılmış** olmalı (bas ve
bırak aynı nesnede). Basıp sürükleyip başka yerde bırakmak tıklama değildir; sürükleme
(taşıma ya da kement) sayılır.

**Shift ile tek tek seçim.** Shift seçime nesne **ekler** (tek tıkla ya da alan
seçerek). Shift basılıyken **zaten seçili** bir nesneye tıklamak onu seçimden
**çıkarır** (toggle).

**Alan (kement / dikdörtgen) seçimi.** Tuvalde boşluğa (ya da kilitli zemine) basıp
bırakmadan sürükleyince, seçim aracının **farklı renkli, ince kesik çizgili**
dikdörtgeni çıkar. Hangi nesnelerin ele alınacağı ve seçime ne yapılacağı
değiştirici tuşlara bağlıdır:

| Tuş | İsabet ölçütü | Seçime etkisi |
|---|---|---|
| (yok) | dikdörtgenin **tamamen içinde** kalanlar | seçimi **değiştir** (replace) |
| **Ctrl** | kesik çizginin **üzerinden geçtiği** (kesişen) tümü | seçimi **değiştir** (replace) |
| **Shift** | tamamen içinde kalanlar | **toggle**: seçili değilse ekle, seçiliyse çıkar |
| **Shift+Ctrl** | üzerinden geçtiği tümü | **toggle**: seçili değilse ekle, seçiliyse çıkar |
| **Shift+Alt** | tamamen içinde kalanlar | **yalnız ekle** (seçiliyi asla çıkarma) |
| **Shift+Ctrl+Alt** | üzerinden geçtiği tümü | **yalnız ekle** (seçiliyi asla çıkarma) |

Kurallar, tek tek:
- **Ctrl** isabet ölçütünü "tamamen içinde"den "üzerinden geçen (kesişen)"e çevirir.
- **Shift** alan seçimini *toggle* yapar: ölçüte uyan **seçili olmayan** nesneler
  eklenir; ölçüte uyan **zaten seçili** nesneler çıkarılır.
- **Alt** (yalnız shift ile birlikte anlamlıdır) toggle'ın *çıkarma* kısmını iptal
  eder: ölçüte uyan zaten seçili nesneler **çıkarılmaz**, mod "yalnız ekle" olur.
  *Amaç:* bir grubun bir kısmı seçiliyken kalanını da seçerken önceki seçilenleri
  kaybetmemek.
- **Kilitli nesneler** bu ölçütlerin hiçbiriyle seçilmez; üzerinden geçilse veya
  tamamen kapsansa bile dışarıda kalır.

### 9.8. Geometri ve konum modeli: x/y · sx/sy · tx/ty

**Koordinat uzayı.** `x` ve `y` her zaman nesnenin **gerçek/canlı** konumunu, kendi
**ebeveyninin koordinat sistemi** içinde gösterir. Kök düzeydeki nesneler için bu
doğrudan Tuval üzerindeki konumdur; bir grubun (`g`) çocuğu için ebeveynin içindeki
konumdur.

**Her nesne için iki konum + bir ofset:**

- **x, y — canlı konum.** Taşıma/boyutlandırma sonrası bile her an gerçek güncel
  konumu gösterir.
- **sx, sy — sabit (baseline) konum.** "Sabit x / sabit y." Dosya **ilk açıldığında**
  x,y'den kopyalanır ve **dosya kaydedilene kadar korunur** (taşımalardan etkilenmez).
  Amacı: "bu nesne dosya açıldığında neredeydi" bilgisini saklayıp, kaydetmeden
  istenildiğinde eski konuma dönebilmek.
- **tx, ty — taşı (offset).** "Taşı x / taşı y." Baseline'a göre kayma:
  `tx = x − sx`, `ty = y − sy`. Hem gösterilir hem düzenlenebilir (bir kutuya değer
  yazınca o kadar taşınır).

**Bağlayıcı kural (değişmez):** Baseline'ı olan bir nesnede her zaman
`x = sx + tx` (ve `y = sy + ty`):
- `x`'i değiştir → `tx = x − sx` yeniden hesaplanır.
- `tx`'i değiştir → `x = sx + tx` olur.
- Fareyle taşı → `x` güncellenir, `tx` yeniden hesaplanır.
- `sx` sabit kalır (yalnız kayıt veya yeni-nesne baseline kurulumunda değişir).

**Yaşam döngüsü:**
1. **Dosya açılışı:** her nesne için `sx ← x`, `sy ← y` (dolayısıyla `tx = ty = 0`).
2. **Yeni nesne oluşturma:** `sx = sy = null` — kontrol için ayırt edici bir
   sentinel; "henüz baseline yok" demektir.
3. **İlk taşıma (baseline kurulumu):** Bir nesneye `tx`/`ty` *verildiğinde*,
   uygulanmadan **önce** baseline yoksa (`sx`/`sy == null`) `sx ← x`, `sy ← y`
   yapılır; sonra taşıma uygulanır. (Açılmış nesnelerde baseline zaten kuruludur;
   bu adım yalnızca yeni nesnelerde tetiklenir.)
4. **Kaydetme:** tüm nesnelerde `sx ← x`, `sy ← y` (baseline güncel konuma sıfırlanır,
   `tx, ty → 0`). Kaydedilen dosyanın yeni "eski konumu" artık budur.

**Baseline'a dönüş:** "Sabit konuma dön" eylemi `x ← sx`, `y ← sy` (`tx, ty → 0`)
yaparak kaydetmeden yapılan tüm kaymaları geri alır (bir Command'dır).

**Örnek izi:**
- Aç: `x=50, sx=50, tx=0`.
- `tx` kutusuna 5 yaz: `x=55, sx=50, tx=5` (açılışta 50'ymiş, 5 kaydırılmış).
- Fareyle 80'e taşı: `x=80, sx=50, tx=30` (ne kadar kaydırıldığı da belli).
- Kaydet: `sx=80, tx=0` (yeni baseline).

**Saklama ve durum:** `x, y` belge durumudur (değiştirmek Command'dır, undo'ya girer).
`sx, sy` baseline meta verisidir; kullanıcı doğrudan düzenlemez, sistem yönetir
(açılış / kayıt / yeni-nesne ilk taşıma). `tx, ty` türetilmiştir (`x − sx`); ayrı
saklanması şart değildir. `sx, sy`'nin dosyada (10. ilkedeki yorumlarla) kalıcı
saklanmasına gerek yoktur: kayıtta `x`'e sıfırlandığı için yeniden açılışta zaten
`x`'ten kurulur. (Kilit gibi *kalıcı* kontrol durumları ise 10. ilke yorumlarıyla
saklanır.)

---

## 10. Desteklenecek özellikler (Blink) — gruplu ve etiketli

Aşağıdaki liste editörün **üretebileceği** kümedir = Blink'in fiilen
desteklediği özellikler. (Üç-motor karşılaştırmasının tam hali ayrı dosyadadır:
`svg_uyumluluk_listesi.md`.) Her grup, 9. bölümdeki sınıflandırmaya göre
etiketlidir: **[ARAÇ]** = Tuval'de doğrudan; **[TANIM/EK]** = sağ panel;
**[DENETÇİ]** = seçili nesnenin alanı.

### 10.1. Temel Şekiller — [ARAÇ · Tuval]
`rect` · `circle` · `ellipse` · `line` · `polyline` · `polygon` · `path`
(tüm `d` komutları: M/L/C/S/Q/T/A/Z)

### 10.2. Metin — [ARAÇ · Tuval]
`text` · `tspan` · `textPath`
(SVG fontları YOK — yazı tipi olarak WOFF/TTF/OTF kullan)

### 10.3. Yerleştirilen içerik — [ARAÇ · Tuval]
`image` · `foreignObject` · `use` (bir `symbol`/tanım örneğini tuvale yerleştirir)

### 10.4. Belge Yapısı ve Kapsayıcılar — [TANIM/EK · sağ panel, "Yapı"]
`g` (grup) · `defs` · `symbol` · `use` (tanım tarafı) · `title` · `desc` ·
`metadata` · `view`
(grup/çöz işlemi Tuval'den tetiklenir, yapı ağacında görünür)

### 10.5. Boyama ve Paint Server'lar — [karma]
- **[DENETÇİ]** per-nesne: `fill`, `stroke`, `*-opacity`, `stroke-width`,
  `stroke-dasharray/linecap/linejoin`, `paint-order`
- **[TANIM/EK]** yeniden kullanılabilir: `linearGradient` (+`stop`) ·
  `radialGradient` (`fr` dahil) · `pattern` · `marker`
  (`orient="auto-start-reverse"` dahil)

### 10.6. Kırpma / Maskeleme / Kompozisyon — [TANIM/EK · sağ panel]
Tanım: `clipPath` · `mask` — uygulama: `clip-path` / `mask` ·
`mix-blend-mode` · `isolation` · grup opaklığı

### 10.7. Filtreler — [TANIM/EK · sağ panel]
`filter` + primitifler: `feGaussianBlur` · `feColorMatrix` ·
`feComponentTransfer` (+`feFuncR/G/B/A`) · `feComposite` · `feBlend` ·
`feMerge`/`feMergeNode` · `feOffset` · `feFlood` · `feImage` · `feTile` ·
`feMorphology` · `feDisplacementMap` · `feTurbulence` · `feConvolveMatrix` ·
`feDiffuseLighting` · `feSpecularLighting` · ışık kaynakları
(`feDistantLight`/`fePointLight`/`feSpotLight`) · `feDropShadow`

### 10.8. Animasyon — [TANIM/EK · sağ panel + Zaman Çizelgesi]
- **SMIL:** `animate` · `animateTransform` · `animateMotion` (+`mpath`) · `set` ·
  `discard` · `d`-morph (path şekil animasyonu)
- **CSS:** `@keyframes` / CSS animations
- **JS:** Web Animations API (WAAPI)
- (`animateColor` YOK → `animate` kullan)

### 10.9. SVG 2 ve CSS Uzantıları — [çoğu DENETÇİ alanı]
CSS geometri (`x`/`y`/`width`/`r`/`cx`... CSS'te) · `vector-effect:
non-scaling-stroke` · CSS `transform` + bireysel `translate`/`rotate`/`scale` ·
`paint-order` · `auto-start-reverse` · (kısmi) `context-fill`/`context-stroke`

### 10.10. ÜRETME — Blink'te render olmaz / kaldırılmış (kara liste)
Bunları araç ya da tanım olarak **sunma**; okurken kabul edip normalize et
(8. ilke), ama yazarken üretme:
`meshGradient`/`mesh` · `hatch`/`hatchpath` · `solidColor` · SVG fontları
(`font`/`glyph`/`hkern`...) · `tref` · `animateColor` · `cursor` (SVG) ·
`switch` (hiçbir motor doğru işlemez)

---

## 11. Kullanıcı kolaylıkları ve özellik yol haritası

Çekirdek araçların ötesinde, kullanıcı verimini artıran özellikler. Hepsi
registry kaydıdır (araç / panel / komut / işlem) — eklemek kabuğu bozmaz. Durum
ayrımına dikkat: yapışma/kılavuzlar/komut paleti **görünüm durumu**dur (undo'ya
girmez), yol/şekil işlemleri ve dönüşümler **belge durumu**dur (her biri Command).
Bunlar MVP'nin *üstüne* dalgalar hâlinde gelir; mevcut yapıyı bozmaz.

### 11.1. Yapışma ve kılavuzlar (görünüm/araç durumu — undo'ya girmez)
- **Akıllı kılavuzlar** — taşırken diğer nesnelerle hizalandığını gösteren anlık çizgiler.
- **Yapışma (snap)** — ızgaraya, kılavuzlara, düğümlere, nesne kenar/merkezlerine ve piksele yapış.
- **Izgara · cetveller · kılavuz çizgileri · piksel önizleme** (rastere çevirirken keskinlik için).
- **Sürüklerken canlı ölçü** — mesafe/boyut etiketleri.
- (Bunlar yalnız sonucu, yani taşımayı, Command yapar; yardımcıların kendisi görünüm durumudur.)

### 11.2. Yol ve şekil işlemleri (her biri Command — belge durumu)
- **Boole işlemleri** — birleştir / çıkar / kesiştir / dışla.
- **Yol işlemleri** — dış hattı yola çevir (outline), **basitleştir**, yolu tersine çevir,
  yolları birleştir/ayır, düğüm ekle/çıkar.
- **Çoğalt ve dizilim** — ızgara/dairesel kopya (array).

### 11.3. Üretkenlik
- **Komut Paleti (Ctrl+K)** — her komutu/aracı arayıp çalıştır (görünüm durumu; tetiklediği
  işlem Command üretir).
- **Geçmiş paneli** — görsel undo/redo; Command geçmişinin ve sınırlı seçim geçmişinin (9.6) görünümü.
- **Bileşenler / Semboller** — `<symbol>`+`<use>`; ana sembolü düzenle → tüm örnekler güncellenir.
  Kurulu Tanımlar/defs altyapısına (8. bölüm) doğal oturur.
- **Renk paleti & son kullanılanlar** · **yerinde yapıştır** · **oranı kilitle**.

### 11.4. SVG-native süper güçler (tek formatımız SVG olduğu için — 10. ilke)
- **Canlı SVG kod paneli** — çift yönlü senkron: tuvalde seçileni kodda vurgula, kodda değişeni
  tuvalde göster. Tek doğruluk kaynağı yine belge modelidir (3. ilke); panel onun bir görünümüdür.
- **Optimize / temizle** — kullanılmayan defs'leri at, koordinatları yuvarla, yolları sadeleştir
  (SVGO benzeri). 8. ilkedeki "temiz / geniş uyumluluk" dışa-aktarım profiline bağlanır.
- **Erişilebilirlik yardımcıları** — `title` / `desc` / `aria` alanları (Tanımlar tarafında başladı).

### 11.5. Animasyon kolaylıkları (Zaman Çizelgesi olgunlaştıkça)
- **Soğan kabuğu** (onion skin) — önceki/sonraki kareleri soluk göster.
- **Easing eğrisi editörü** — animasyon hız eğrisini görsel düzenle.
- **Zaman çizelgesinde keyframe düzenleme** · animasyonu **yol üzerinde canlı önizleme**.

### 11.6. Önceliklendirme dalgaları
- **1. dalga (çekirdek vektör hissi):** Seç · Düğüm · temel şekiller · Kalem ·
  yapışma/akıllı kılavuzlar · boole işlemleri.
- **2. dalga:** Şekil Oluşturucu · Semboller/Bileşenler · Canlı SVG kod paneli · Komut Paleti.
- **3. dalga:** animasyon kolaylıkları (zaman çizelgesi olgunlaştıkça).

Her dalga öncekini bozmadan gelir; her özellik bir registry kaydıdır. Bir özelliğe
başlamadan önce 8.4'teki soruyu sor: "Bu, mevcut bir ilkeyi mi kullanıyor, yoksa
kabuğu/paneli/sözleşmeyi mi değiştirmem gerekiyor?" İkincisiyse dur ve danış —
düzeltilecek yer özellik değil, zemindir.
