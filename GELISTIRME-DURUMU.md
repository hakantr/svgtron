# Geliştirme Durumu / Devir Notları

> **Bu dosya ne işe yarar:** Başka bir makinede ya da yeni bir oturumda kaldığımız
> yerden devam edebilmek için projenin **güncel uygulama durumunu**, edinilen
> **teknik dersleri**, doğrulama rutinini ve **bekleyen işleri** tutar.
> `AGENTS.md` = değişmez kurallar; `TASARIM-KARARLARI.md` = anlaşılan davranış/UI
> kararları (TK-1..TK-12); **bu dosya** = "şu an nerede kaldık + nasıl çalışıyoruz".
> Yeni oturuma başlarken **önce bunu oku.**

Repo: `github.com:hakantr/svgtron` · dal: `main` · dil: **Türkçe** (kod yorumları,
UI, commit mesajları). Electron isimleri (`main`/`preload`/`renderer`) İngilizce.

---

## 0. Son oturum — devir (2026-06-13)

**Bu oturumda tamamlananlar (commit'li, sırayla):**
- **TK-37 #10 — Dışa aktarım profilleri görünür seçim** (commit 9353704). "Dosya ›
  Dışa aktar" artık profili (Uygulama-içi/Blink ↔ Geniş uyumluluk) modalla SORAR;
  eskiden sessizce `genis-uyumluluk`'a sabitti. `disaAktarSor` servisi (görünüm durumu;
  `degisiklikSor` kuyruk/Promise + `hakkinda` feature-tanımlı/kabuk-tüketir deseni).
  Çıktı: blink→`<ad>.svg`, genis→`<ad>-temiz.svg`. Kaydetme "blink" (İlke 10).
- **TK-37 #9 — Kes/Kopyala/Yerinde Yapıştır + Oran kilidi** (7b8f7a0 + 84098c9).
  Pano (görünüm durumu): Ctrl+C/X/V + Düzen menüsü; yapıştır YERİNDE (ebeveyn hâlâ
  belgedeyse aynı koordinat uzayı, değilse kök); her yapıştırma id'siz yeni kopya.
  Oran kilidi: `oranKilidi` store; tuval boyutlandırmada üniform = `acik XOR Shift`
  (döndürülmüş zaten üniform); toggle denetçi geometri başında padlock.
- **TK-39 — CSS editörünü css-tree'ye taşıdım + kütüphane raporu değerlendirmesi**
  (5289975). `stil-css.ts` regex→AST: yalnız üst düzey kurallar, hedef kural konum
  aralığıyla yerinde değişir → kural dışı her şey bayt-bayt korunur. **6 öneriden yalnız
  css-tree alındı; path/renk/SVGO/CodeMirror/DOMPurify gerekçeyle ertelendi/reddedildi**
  (TASARIM-KARARLARI.md TK-39). Bağımlılık: `css-tree@^3` + `@types/css-tree`.
- **TK-37 #8 — Boya seçici son kullanılan renkler** (8b7b617). `sonRenkler` store
  (12 sınır, dedup, şeffaf-atla); kapanışta düz renk(ler) işlenir, popover'da mini
  swatch satırı. Kalıcı belge PALETİ (kaynak/metadata+Command) sonraya.
- **§9.6 (a/b) — mod-duyarlı referans işareti + tıkla-referans-ata** (beb3be4).
  (b) çoklu seçimde seçili nesneye modifiersiz tık = referans yap (seçim bozulmaz).
  (a) yeni saf `referansDugum(belge, secililer, mod)` (hizala-referans.ts); Tuval
  işareti moda göre (son-secilen/anahtar/secim-belge-null); hizalama da aynı helper'ı
  kullanır (tek kaynak). §9.6(a/b) artık TAM.
- **TK-37 #6 — Gelişmiş metin denetçisi + textPath bağlama** (6ccaa88). Yeni "Metin"
  alan seti (yazı tipi/boyut/ağırlık/stil/hizalama/harf aralığı; efektif okuma+TK-18).
  Yeni "Metin" menü grubu: Yola Bağla (textPath)/Yoldan Çöz; saf dönüşümler `metin-yol.ts`
  (birim testli), wiring tek BilesikKomut.
- **TK-37 #7 — foreignObject (Gömülü HTML) aracı** (54bd7a0). Tıkla→foreignObject+XHTML
  div. **Yansıtıcı ad-uzayı duyarlı yapıldı** (foreignObject çocukları XHTML_NS; varsayılan
  SVG_NS → sıfır regresyon). Güvenlik uyarısı toast (geniş-uyumluluk riski).
- **TK-37 #2 (1/2) — Izgara + ızgaraya yapışma** (8d1acf3). `izgara` store; tuval CSS-arka-plan
  ızgara overlay (kök CTM, zoom/pan tutarlı); seç aracı sürüklemede nesne-yapışması olmayan
  eksende ızgara çizgisine çeker (saf `izgaraYapis`, 5/5 testli). Görünüm menüsü toggle.
  **KALAN: cetvel + sürüklenebilir kılavuzlar (saf görsel).**
- **TK-37 #4 (1/2) — Hareket Yolu (animateMotion) uygulama** (069aa1e). "Animasyon"
  menüsü: seçili nesne + yol (referans) → nesneye animateMotion+mpath (rotate=auto).
  Saf `hareketYoluDugumu` 2/2 testli; SMIL oynar. **KALAN: tuvalde yol-çiz aracı (görsel).**
- **TK-37 #3 (çekirdek) — Gradyan vektör geometrisi** (4b446aa). Saf `gradyan-geometri.ts`
  (`noktaOfset`/`ofsetNokta`, 5/5 testli) — tuvalde durak sürüklemenin koordinat-bağımsız
  çekirdeği. **KALAN: etkileşimli overlay (objectBoundingBox↔ekran eşlemesi) — görsel.**
- **Not (kullanıcı talimatı):** Commit'lere `Co-Authored-By` trailer'ı EKLENMEDİ
  (kullanıcı "kendini contributors'a kaydetme" dedi) — §5'teki eski trailer kuralı
  geçersiz. Push YAPILMADI (yerel commit'ler; dışarı çıkış onayı saklı).

**Bu oturumun saf-mantık testleri** (esbuild→`node --test`, §1; repoda tutulmaz):
disaAktar profil 4/4 · disaAktarSor 3/3 · stil-css (css-tree) 7/7 · sonRenkler 5/5 ·
referansDugum 4/4 · metin-yol 4/4. (Pano/oran-kilidi/denetçi alanları/foreignObject
render DOM'a bağlı → typecheck/build/smoke + akıl yürütme; görseller gözle teyide tabi.)

**Bekleyen — yalnızca SAF GÖRSEL/ETKİLEŞİMLİ UI kaldı (testlenebilir mantık çekirdeği
TÜKETİLDİ; çalışan ekran şart, §5):**
- #2 cetvel (ruler) + sürüklenebilir kullanıcı kılavuzları
- #3 gradyan overlay etkileşimi (çekirdek `gradyan-geometri.ts` HAZIR)
- #4 tuvalde yol-çiz aracı (uygula çekirdeği HAZIR; araç-overlay framework TK-9'da)
- #5 zaman çizelgesi (keyframe/easing/onion)
- #1 sembol izolasyon modu
- TK-36 macOS doğal menü (Linux'ta teyitsiz)

Bu oturumda backlog'un **VERIFIABLE çekirdeği olan HER kalemi** bitirildi. Kalanlar için
artık birim test edilebilir mantık yok; doğrulukları "ekranda doğru görünüyor/oynuyor mu?"
sorusudur → `npm run dev` ile gözle yapılmalı. Yapı kurulabilir ama render/etkileşim
körlemesine "bitti" sayılMAMALI.

---

## 0b. Önceki oturum — devir (2026-06-12)

> **Başka makineye geçiş:** Bu oturumdaki tüm iş `main` üzerinde **yerel commit**;
> push otomatik modda engelli. Devretmek için bu makinede `git push origin main`,
> öbür makinede `git pull`. Sonra `npm install` → doğrulama rutini (§1).

**Bu oturumda tamamlananlar (commit'li):**
- **TK-35 — Birleşik seçim geçmişi (§9.6 d–g).** `KomutGecmisi` tek `Girdi[]`+`#konum`
  birleşik zaman çizelgesi (düzenleme + seçim adımları); `SecimGecmisIzleyici`
  (çekirdek) erteleme/flush/bırakma + 5'lik kayan pencere. ctrl+z/ctrl+y artık seçim
  adımlarında da gezer.
- **TK-35 düzeltmeleri (adversaryal denetim).** Çok-ajanlı denetim gerçek bir regresyon
  buldu: çoklu-seçim sil/çoğalt/grupla/çöz = iki ctrl+z. Düzeltildi: `secimKaydiBastir`
  (düzenleme yan etkisi seçim ayrı adım yazmaz), `ileriDaliTemizle` (redo dalı), navigasyon=
  committed (yinele yok), Ctrl+Z/Y/D/G yazı alanında native'e bırakılır, etiket/panel.
- **TK-38 — Kod denetimi bulguları:** (1) §9.2 hizalama referans modları (son seçilen/
  anahtar/seçim/belge), (2) "Uygulanan tanımlar" yalnız `<style>` tanımlı sınıfları
  listeler, (3) gradyan açı `userSpaceOnUse` fidelity, (4) **Faz F** güvenli yeniden
  adlandırma + "kullanıldığı yerler".

**Yeni saf-mantık testleri** (esbuild→`node --test`, §1):
`secim-gecmis-izleyici.test.ts` (11/11), `referans-yeniden-adlandir.test.ts` (5/5).

**Bekleyen (planlandı, henüz UYGULANMADI):**
- **TK-36** macOS doğal uygulama menüsü + platforma uygun Hakkında ekranı.
- **TK-37** geliştirme adayları yol haritası (oran kilidi vb. — bkz. TASARIM-KARARLARI.md
  TK-37). **#10 (dışa aktarım profillerini görünürleştirme) 2026-06-13'te UYGULANDI;**
  kalan adaylar bekliyor.
- Ayrıca §6'daki ertelenenler (animasyon kolaylıkları, serbest-dönüştür, vb.).

> Not: `AGENTS.md` artık `./AGENTS.md`'ye symlink (Codex `AGENTS.md`, Agents `AGENTS.md`
> okur; tek doğruluk kaynağı AGENTS.md). Eski `AGENT.md` symlink'i kaldırıldı.

---

## 1. Hızlı başlangıç ve doğrulama

```bash
npm install            # lit, polygon-clipping, electron, electron-vite, electron-builder
npm run dev            # geliştirme (HMR)
npm run typecheck      # tsc --noEmit  (strict)
npm run build          # electron-vite build → out/
npm run dist           # electron-builder ile paketleme (yerel)
```

**Her değişiklikten sonra rutin:** `npm run typecheck` → `npm run build` → smoke.
Smoke (uygulama hatasız açılıyor mu):

```bash
ELECTRON_ENABLE_LOGGING=1 timeout 9 node node_modules/electron/cli.js . 2>&1 | \
  grep -iE "Uncaught|CONSOLE.*error|TypeError|cannot read|zaten kayıtlı" | \
  grep -viE "GPU|sandbox|zygote|network_service|GetTerminationStatus"
# Çıktı boşsa temiz. (Agents'un kum havuzunda exit 124 = temiz kapanış; GPU/sandbox
# satırları kum-havuzu artefaktıdır, gerçek hata değil.)
```

**Saf mantık birim testi** (DOM'suz modüller — yol/bool/şekil geometrisi):
esbuild ile `.mjs`'e bundle'layıp `node` ile koştur. Örnek:
```bash
npx esbuild src/cekirdek/belge/model/yol.ts --format=esm --outfile=/tmp/t/yol.mjs
# test .mjs yaz, import et, node ile koştur
```
Test edilmiş saf modüller: `yol.ts` (16), `yol-duzenleme.ts` (7), `bool-geometri.ts`
(10), `bool.ts/atomikYuzler` (9), `sekil-geometri.ts` (6).

> Not (yalnız Agents kum havuzu): `npm install` postinstall'u engellenirse Electron
> binari'sini elle indir: `node node_modules/electron/install.js`. Smoke için
> `dangerouslyDisableSandbox` gerekir. Kullanıcının gerçek makinesinde bunlar gereksiz.

---

## 2. Mimari hatırlatıcılar (kısa)

10 değişmez ilke `AGENTS.md`'de. Pratikte en çok dokunulan desenler:

- **Her düzenleme bir Command'dır** (`uygula`/`geriAl`). DOM'a komut dışında kalıcı
  mutasyon yok. Sürükleme sırasında DOM'a *önizleme* yazılır (görünüm durumu),
  **bırakınca tek Command** commit edilir. Komut ilkelleri:
  `OznitelikDegistirKomutu`, `MetinKomutu`, `DugumEkle/Cikar/DegistirKomutu`,
  `SiraKomutu`, `BilesikKomut`, `KilitKomutu` (`src/cekirdek/komutlar/`).
- **Registry ile eklenir** (kabuk hiç değişmez): `arac` (araçlar), `panel`,
  `menu`, `tema`, `kaynak-turu`, `alan-seti`. "Yeni özellik = yeni kayıt + index.ts
  import'u." (`src/cekirdek/registry/`, kayıtlar `src/renderer/.../*.ts`,
  import'lar `src/renderer/index.ts`).
- **Belge modeli soyut** (`Dugum` ağacı, `src/cekirdek/belge/`): DOM değil. İçe
  aktarım liberal, dışa aktarım profilli (`ice-aktar.ts`/`disa-aktar.ts`). Render:
  `Yansitici` (`tuval/yansitici.ts`) modeli DOM'a **uyumlar** (yeniden kurmaz →
  SMIL bozulmaz).
- **Görünüm durumu Command üretmez** (zoom/pan, hover, tutamaç, kement, kılavuz,
  açık panel, komut paleti). Tek istisna seçim: kendi **sınırlı geçmişiyle** birleşik
  undo'ya girer (§9.6 d–g, TK-35 — `SecimGecmisIzleyici`). Düzenleme yan etkisi seçim
  değişimi `secimKaydiBastir` ile geçmişe yazılmaz (bir eylem = tek geri-al).
- **Çekirdek Electron'dan habersiz.** IPC tek tipli sözleşmeden geçer
  (`ortak/api-sozlesmesi.ts` → `preload/kopru.ts` → `main/`). Kanal eklemek =
  4 dosya (sözleşme + köprü + main handler + servis). Örnek: `gorselAc`.

---

## 3. Tamamlananlar (uygulama durumu)

**§11.6 1. & 2. dalga: tamam.**

**Araçlar** (`src/renderer/araclar/tools/`, sol çubuk, sıraya göre):
Seç · Düğüm (çapa+Bézier) · Şekil Oluşturucu (atomik bölge birleştir) · Kalem ·
Kurşun Kalem (serbest) · Dikdörtgen · Elips · Çizgi · Çoklu Çizgi · Çokgen ·
Yıldız · Spiral · Metin · Görsel (`<image>` data-URI) · Pipet · El · Yakınlaştır.
Çizgi seçilince **uç tutamaçları**, diğer şekillerde 8 boyut + döndürme tutamacı.

**Kaynak türleri** (sağ panel "Tanımlar", `tanimlar-paneli/turler/`):
filter · marker · gradyan · stil(CSS sınıfı) · pattern · clipPath · mask.
Her tür: listele/uygula/oluştur/sil **+ görsel önizleme + tıkla-düzenle (gradyan/marker/
stil/filter/pattern editörleri) + katlanabilir gruplar (TK-33)**. Faz A–G tamam.
Gradyan düzenleyicisinde **yön/açı (derece) alanı** (TK-34).

**Menü grupları** (registry → menü çubuğu + Komut Paleti):
- `dosya`: Yeni · Aç · Son Dosyalar (dinamik alt-menü, TK-20) · Kaydet · Dışa aktar
- `duzen`: Geri/İleri Al · Çoğalt · Sil · Grupla · Çöz · Sembol Yap · Sembolü Genişlet
- `donustur`: Yatay/Dikey Yansıt
- `yol`: Birleştir · Çıkar · Kesiştir · Dışla · Tersine Çevir · Basitleştir
- `belge`: Kullanılmayan tanımları temizle · Koordinatları yuvarla · Dejenere şekilleri sadeleştir (path→çizgi + sıfır-boyut sil, TK-16)
- `yardim`: Hakkında (TK-32)
- (Dil seçimi artık menüde değil → **Üst Çubuk'ta dünya simgesi** açılırı.)

**Sağ paneller** (Y7 sonrası **simge raylı, tek panel açık, genişlik tutamaçlı**;
ray simgeleri gruba uygun **SVG ikon**, TK-17): Özellik Denetçisi (sağ içeriği
doldurur; alan setleri: görünüm · geometri · **marker (BAŞ/ORTA/SON kutuları)** ·
**Uygulanan tanımlar (filtre/kırpma/maske `<select>` + stil sınıfı çipleri — seçili
nesneye atama, TK-34)** · metadata) · Katmanlar (**+ "Artboard yap/kaldır" — otomatik
aday algısı, TK-23**) · Geçmiş (**sağ alanı tam doldurur, TK-34**) · **Hizalama
(+ yol/boole eylemleri)** · Tanımlar.
**Alt:** Zaman Çizelgesi (oynat/duraklat/sar — SMIL+WAAPI, `Playback` arayüzü).
**Üst Çubuk:** hamburger↔menü · "Komut ara…" kutusu (Ctrl/Cmd+K) · tema · **dil (dünya simgesi açılırı)** · pencere.

**Diğer:** komut paleti · geçmiş paneli (tıkla-atla) · **birleşik seçim geçmişi
(düzenleme + seçim adımları tek ctrl+z/ctrl+y zinciri; 5'lik kayan pencere; tek-seçim
erteleme/flush — §9.6 d–g, TK-35)** · semboller (`<symbol>`+`<use>`)
· **canlı SVG kod paneli (çift-yönlü seçim + geri-alınabilir "Uygula", TK-26)** · boole
(polygon-clipping) · yapışma+akıllı kılavuzlar (Alt kapatır) · klavye nudge ·
optimize/temizle · path genişlik/yükseklik (görsel bbox)
· erişilebilirlik (title/desc/aria-label) · **stil yazım modu (inline/CSS/otomatik,
TK-18 — `stilUygulaKomutu` tüm apply'ları yönetir)** · **artboard (sayfa zemini,
TK-23 — kilitli zemin + tuvalde sayfa çerçevesi; yüzde/sayısal tam-kapsama algısı;
İlke 10 yorumuyla kalıcı)** · **araç çubuğu tek sütun + sıkışık; yükseklik yetmezse
dikey kaydırma + alt/üst ok + tekerlek, TK-25)** · **i18n: `en.dil` (tr.dil anahtar dosyası, TK-24; tr-dışı seçimde eksik
anahtarları `?` ile işaretleyen otomatik senkron, TK-28)** · **kaydedilmemiş
değişiklik sorma — sekme/pencere kapatmada (TK-27/30; main kapanış onayı + zorla-kapat
koruması)** · **denetçide Dönüşüm editörü (transform'u öteleme/ölçek/döndürme/eğme
olarak düzenle, TK-29)** · **çoklu belge / sekmeler (vekil store mimarisi; Yeni/Aç
yeni sekmede; tek tuval aktif belgeyi izler, TK-30)** · **tuval/belge ayarları (seçim
yokken denetçide kök `<svg>` width/height/viewBox, TK-31)**.

**CI/CD:** `.github/workflows/build.yml` — her push'ta `temizle → derle (3 OS ×
x64/arm64) → yayinla` → herkese açık **`latest`** GitHub Release (kendi kendine
yeten AppImage/dmg/exe-portable+kurulum/zip/tar.gz). `gh run list`/`gh release view
latest` ile izlenir. electron-builder.yml + build/icon.png.

---

## 4. Edinilen teknik dersler / tuzaklar (TEKRARLAMA)

1. **`getCTM()` Chrome'da viewBox dönüşümünü İÇERİR** → yerel→kök eşlemesi için
   YANLIŞTIR (boole sonucu kayar/ölçeklenir). Doğrusu: `kokInv ∘ el.getScreenCTM()`
   (ekran/viewBox/zoom sadeleşir). Bkz. `bool.ts dugumCokPoligonu`, commit 6105124.
2. **CSP**: `index.html`'de `img-src 'self' data:` ŞART — yoksa `<image>` data-URI
   ve `new Image()` data-URI yüklenmez (commit 8b2787f).
3. **Koordinat yuvarlama** birimli değerlere dokunmamalı (`100%` → `100` zemini
   küçültür). Yalnız saf sayı regex'i ile yuvarla.
4. **Seçim tıklaması basış isabetiyle çözülmeli**, release'te yeniden isabet ETME —
   release tutamacın üstüne düşüp seçimi siler (commit 82e4436, `sec-araci basHedef`).
5. **Lit + imperatif çocuk**: bir region kabı template'te BOŞ bırakılırsa (`<div></div>`)
   Lit onun imperatif eklenen çocuklarına dokunmaz. Sağ panel rayı bunu kullanır
   (`.sag-icerik` boş template, paneller imperatif eklenir, görünürlük `style.display`
   ile). `?hidden`/`style` binding'leri çocukları bozmaz.
6. **`<symbol>`+`<use>` konum korunumu**: `<symbol overflow="visible">` + `<use>`
   (width/height YOK) içeriği özgün koordinatta render eder.
7. **Tuval bindirme çerçevesi** (Düğüm/Şekil Oluşturucu araçları): `Arac.tutamacGizle`
   (boyut tutamaçlarını gizle) + `Arac.konumla()` (her kare yeniden yerleştir) +
   `AracBaglami.aracKatmani()` (ekran-koord. `<svg>` bindirme). Jenerik, additive.

---

## 5. Çalışma kuralları (bu projede edinilen)

- Küçük, odaklı commit'ler; çalışmayan ara durum bırakma. Commit mesajı sonunda:
  `Co-Authored-By: Agents Opus 4.8 (1M context) <noreply@anthropic.com>`.
- İş bitince commit + `git push origin main` (push CI'ı tetikler).
- Her yeni davranış/UI kararını **TASARIM-KARARLARI.md**'ye TK-n olarak ekle.
- §8.4 kuralı: özelliğe başlamadan "mevcut ilkeyi mi kullanıyor, yoksa kabuğu/
  sözleşmeyi mi değiştiriyorum?" diye sor. İkincisi + büyük bağımlılık → kullanıcıya
  danış (kullanıcı onayladıysa devam).
- **Görsel doğrulama yapılamayan ortamda** (ekran yok): saf mantığı birim testle,
  yapıyı typecheck/build/smoke ile doğrula; **gözle teyit gereken görsel/animasyon
  işlerini körlemesine "bitti" sayma**, kullanıcı geri bildirimine bırak.
- Kullanıcı, hız için **5 ajana kadar** izin verdi — ancak "hata tespitinde benim
  kadar yetenekli" olmalı; paylaşılan ağaçta eşzamanlı `tsc` çapraz-kontaminasyonu
  riski var (worktree izolasyonu node_modules içermez). İnce/test-edilemez işleri
  kendin yap, net-spesifikli doğrulanabilir işleri delege et.

---

## 6. Bekleyen iş (öncelikli) — kullanıcı geri bildirimiyle sürdürülecek

> **Kod denetimi turu (çok-ajanlı bul→adversaryal doğrula) yapıldı.** 29 onaylı
> bulgudan güvenlik + mantık hataları düzeltildi (özet altta). Aşağıdakiler
> **bilinçli ertelendi**: ya zemin/sözleşme kararı gerektiriyor (§8.4) ya da
> gözle teyit (çalışan ekran) gerektiriyor (§5).

**Denetimde DÜZELTİLEN (özet):** shell.openExternal şema allow-list + will-navigate
engeli + içe-aktarım `<script>`/`on*`/`javascript:` ayıklama + CSP sıkılaştırma
(TK-13) · yol parser S/T yansıma kübik↔kuadratik + `Z` sonrası sonsuz döngü ·
grup çöz Command-dışı transform mutasyonu (undo bozuktu) · kaynak id/sınıf
oturumlar-arası çakışması (7 tür + gradyan-model → `benzersizId`/`benzersizSinif`,
belgeyi tarar) · gradyan→düz/yok geçişinde öksüz gradyan temizliği (TK-6) ·
CSS+SMIL `BilesikPlayback` · referans indeksi `style`+`href` parsing · şekil
oluşturucu N>8 operand cap · birimli konum→null · rgb(%)/durakEkle/octet-stream/
img.onerror/prefix/boşluk-metin/zaman-çizelgesi modulo. (Birim test: yol S/T+Z,
benzersizId, ReferansIndeksi — hepsi geçti.)

**Denetim sonrası ertelenenler — HEPSİ ÇÖZÜLDÜ:**
- **Y3 — Pipet: ÇÖZÜLDÜ.** Araç bildirim kanalı (TK-14): `bildirimServisi` +
  `AracBaglami.bildir` + kabukta toast. Pipet hedef yokken uyarı, Görsel
  yüklenemeyince hata; menü/dosya/yol/komut-paleti hataları da aynı yüzeyden.
- **Faz F (canlı indeks + güvenli silme): ÇÖZÜLDÜ (TK-15).** Referans indeksi artık
  `bildir`'de kirletilip erişimde tembel yeniden kurulur (bayatlamaz). Kaynak silme
  artık `kaynakReferansTemizle` ile atıf veren şekillerden `url(#id)`/`class`
  referanslarını da temizler (tek BilesikKomut, dangling kalmaz) ve etkilenen sayıyı
  toast'la bildirir. (`belge/tanimlar/referans-temizle.ts`; birim testli 9/9.)
- **Döndürülmüş resize skew: ÇÖZÜLDÜ.** `#tutamacTransform` artık rotate/eğme
  varsa (`el.transform.baseVal.consolidate()` b/c≠0) ÜNİFORM ölçeğe zorlar —
  izotropik ölçek rotasyonla değişmeli olduğundan shear oluşmaz. (Tam yerel-eksen
  OBB resize hâlâ ileri iş; bu mitigasyon skew bug'ını giderir, gözle teyit önerilir.)
- **WaapiPlayback bayatlığı: ÇÖZÜLDÜ.** `OynatmaDeposu.tazele` (durum-koruyan:
  oynat/konum geri yüklenir); Tuval düzenleme yolunda animasyon imzası (WAAPI sayısı
  + SMIL eleman sayısı) değişirse tazeler — değişmezse oynatma kesintisiz.
- **`nesle()` temsil noktası: ÇÖZÜLDÜ.** İlk köşe yerine kenar-orta + centroid'e
  küçük kayma (PNPOLY sınır kararsızlığı / paylaşılan köşede yanlış nest). Birim
  testli 10/10 (donut/ada/köşe-paylaşımı).

**Görsel/animasyon — çalışan ekranla kurulacak (bilinçli ertelendi):**
- **§11.5 wave-3:** soğan kabuğu · easing eğrisi editörü · zaman çizelgesinde
  keyframe düzenleme · yol üzerinde canlı önizleme.
- **§11.1:** ızgara + cetvel render hizası (yapışma var); sürüklerken canlı ölçü.
- **§9.2:** serbest-dönüştür/eğme · hareket-yolu (animateMotion) · textPath ·
  foreignObject · grup-içi izolasyon seçimi · tuvalde gradyan durağı sürükleme.
- **§11.3 küçük:** son kullanılan renkler · yerinde yapıştır · oran kilidi.
- **macOS platform uyumu:** macOS'ta hamburger/özel üst menü yerine doğal uygulama
  menüsü; Hakkında ekranının Electron/macOS "About" davranışına uygun sunulması
  (TK-36).
- **Faz F:** "kullanıldığı yerler" + güvenli yeniden adlandırma/silme (referans
  indeksi `belge/tanimlar/referans-indeksi.ts` zemini hazır).
- **§9.6 seçim geçmişi (d–g): ÇÖZÜLDÜ (TK-35).** `KomutGecmisi` birleşik zaman
  çizelgesine dönüştü (düzenleme + seçim girdileri, tek `#konum`); `SecimGecmisIzleyici`
  erteleme/flush/bırakma + 5'lik kayan pencereyi uygular. Birim testli 8/8 (devir
  örneğinin tam izi dahil).
- **§9.6 (a/b) referans işareti + tıkla-referans-ata: ÇÖZÜLDÜ (2026-06-13, beb3be4).**
  (b) seç aracı çoklu seçimde modifiersiz tıkla = referans yap; (a) Tuval işareti
  mod-duyarlı (`referansDugum` saf helper, hizalama ile tek kaynak). İşaretin GÖRSELİ
  gözle teyide tabi.
- **Sembol izolasyon modu:** ana sembolü yerinde düzenleme.

**Mimari notlar:** Hizalama paneli artık rayda bir sekme (önceden seçimde
otomatik beliriyordu) — istenirse contextual davranışa geri alınabilir.

---

## 7. Dizin haritası (özet)

```
src/main/            Electron ana süreç: index.ts, pencere.ts, dosya-servisi.ts
src/preload/kopru.ts contextBridge api yüzeyi
src/ortak/           api-sozlesmesi.ts (IPC tipli sözleşme)
src/cekirdek/        ELECTRON'DAN HABERSİZ çekirdek
  belge/             model (dugum.ts, yol.ts, yol-duzenleme.ts, ice/disa-aktar)
  komutlar/          Command altyapısı + geçmiş
  animasyon/         Playback (smil/waapi) + oynatma-deposu
  secim/             secim-deposu (çoklu seçim)
  registry/          arac/panel/menu/tema/kaynak-turu/alan-seti kayıt defterleri
src/renderer/
  kabuk/             uygulama-kabugu (Üst Çubuk, sağ panel rayı, menü)
  tuval/             tuval-alani, yansitici, donusum, yapisma, cizim-erisimi
  araclar/           arac.ts + cizim-araci/cok-nokta-araci/sekil-geometri + tools/
  ozellikler/        ozellik-denetcisi · katmanlar · gecmis · hizalama · tanimlar-paneli ·
                     zaman-cizelgesi · komut-paleti · semboller · yol-islemleri ·
                     optimize · donustur · duzen · dosya · kod · boya · temalar
  diller/            tr.dil (i18n; anahtar=değer)
  index.ts           tüm özellik modüllerini import eder (self-register)
```
