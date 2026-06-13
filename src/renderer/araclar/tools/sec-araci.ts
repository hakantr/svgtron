import { svg } from "lit";
import {
  aracKayitDefteri,
  SURUKLEME_ESIGI,
  type Arac,
  type AracBaglami,
} from "../arac";
import type { Dugum } from "../../../cekirdek/belge/model/dugum";
import { enDistakiGrup, atasiMi } from "../../../cekirdek/belge/grup";
import { OznitelikDegistirKomutu } from "../../../cekirdek/komutlar/oznitelik-degistir-komutu";
import { BilesikKomut } from "../../../cekirdek/komutlar/dugum-komutlari";
import { transformTasi, ekranDeltaKullanici } from "../../tuval/donusum";
import {
  yapismaHesapla,
  izgaraYapis,
  kutuYap,
  birlestir,
  type Kutu,
  type Kilavuz,
} from "../../tuval/yapisma";
import { izgara } from "../../tuval/izgara";

/** Kapsayıcı/tanım etiketleri — kement nesne olarak ele almaz. */
const NESNE_DISI = new Set(["defs", "style", "title", "desc", "metadata"]);
const YAPISMA_ESIGI = 6; // px (ekran) — Alt basılıyken yapışma kapanır (§11.1)

// Kement (alan seçimi) durumu — tekil araç.
let kementBas: { x: number; y: number } | null = null;
let kementAktif = false;

// Taşıma durumu.
let tasiBas: { x: number; y: number } | null = null;
let tasindi = false;
// Basış anındaki isabet — tıklama çözümü bunu kullanır (release'te yeniden isabet
// güvenilmez: nesne seçilince beliren tutamaçların üstüne düşebilir ve seçimi siler).
let basHedef: Dugum | null = null;
// Grup seçiliyken içine basıldığında DRILL adayı (TK-21): sürüklenirse grup taşınır
// (drill iptal), tıklanırsa (release, sürükleme yok) bu nesne seçilir.
let drillAday: Dugum | null = null;
let asillar: { dugum: Dugum; transform: string; ctm: DOMMatrix }[] = [];
// Yapışma durumu (§11.1) — taşıma başında bir kez yakalanır.
let baslangicKutu: Kutu | null = null; // taşınan seçimin ekran sınır kutusu
let hedefKutular: Kutu[] = []; // sabit hedefler (diğer nesneler + tuval çerçevesi)
// Izgara ekran geometrisi (TK-37 #2) — taşıma başında bir kez yakalanır (client koord).
let izgaraEkran: {
  ox: number;
  oy: number;
  adimX: number;
  adimY: number;
} | null = null;

function nesneler(b: AracBaglami): Dugum[] {
  const kok = b.depo.belge?.kok;
  if (!kok) return [];
  return kok.cocuklar.filter((d) => !NESNE_DISI.has(d.etiket) && !d.kilitli);
}

function dortgen(a: { x: number; y: number }, c: { x: number; y: number }) {
  return {
    x: Math.min(a.x, c.x),
    y: Math.min(a.y, c.y),
    w: Math.abs(a.x - c.x),
    h: Math.abs(a.y - c.y),
  };
}
function icindeMi(
  r: DOMRect,
  k: { x: number; y: number; w: number; h: number },
): boolean {
  return (
    r.left >= k.x &&
    r.top >= k.y &&
    r.right <= k.x + k.w &&
    r.bottom <= k.y + k.h
  );
}
function kesisir(
  r: DOMRect,
  k: { x: number; y: number; w: number; h: number },
): boolean {
  return !(
    r.right < k.x ||
    r.left > k.x + k.w ||
    r.bottom < k.y ||
    r.top > k.y + k.h
  );
}

/** Seçili düğümlerin taşıma başlangıç durumunu (transform + ebeveyn CTM) yakalar. */
function tasimaHazirla(baglam: AracBaglami, olay: PointerEvent): void {
  tasiBas = { x: olay.clientX, y: olay.clientY };
  tasindi = false;
  let birlesim: Kutu | null = null;
  asillar = baglam.secim.secililer.map((dugum) => {
    const el = baglam.eleman(dugum.kimlik);
    const ebeveyn = el?.parentElement as unknown as SVGGraphicsElement | null;
    const ctm = ebeveyn?.getScreenCTM?.() ?? new DOMMatrix();
    if (el instanceof SVGGraphicsElement) {
      const k = kutuYap(el.getBoundingClientRect());
      birlesim = birlesim ? birlestir(birlesim, k) : k;
    }
    return { dugum, transform: dugum.oznitelikler.get("transform") ?? "", ctm };
  });
  baslangicKutu = birlesim;
  // Yapışma hedefleri: seçili OLMAYAN üst-düzey nesneler + tuval (kök) çerçevesi.
  hedefKutular = nesneler(baglam)
    .filter((d) => !baglam.secim.icindeMi(d))
    .map((d) => baglam.eleman(d.kimlik))
    .filter((el): el is SVGGraphicsElement => el instanceof SVGGraphicsElement)
    .map((el) => kutuYap(el.getBoundingClientRect()))
    .filter((k) => k.sag - k.sol > 0 || k.alt - k.ust > 0);
  if (baglam.kok)
    hedefKutular.push(kutuYap(baglam.kok.getBoundingClientRect()));

  // Izgara ekran geometrisi (TK-37 #2) — kök CTM'inden (client koord; baslangicKutu/
  // hedefKutular da client koord). Zoom drag boyunca sabit olduğundan başta yakalanır.
  izgaraEkran = null;
  const ctm = izgara.gorunur ? baglam.kok?.getScreenCTM?.() : null;
  if (ctm && ctm.a > 0 && ctm.d > 0) {
    const o = new DOMPoint(0, 0).matrixTransform(ctm);
    izgaraEkran = {
      ox: o.x,
      oy: o.y,
      adimX: izgara.adim * ctm.a,
      adimY: izgara.adim * ctm.d,
    };
  }
}

/** Ham ekran ötelemesini yapışmayla düzeltir (Alt → kapalı). Kılavuzları da döndürür. */
function yapismaUygula(
  sdx: number,
  sdy: number,
  altKapali: boolean,
): { dx: number; dy: number; kilavuzlar: Kilavuz[] } {
  if (altKapali || !baslangicKutu) return { dx: sdx, dy: sdy, kilavuzlar: [] };
  const hareketli: Kutu = {
    sol: baslangicKutu.sol + sdx,
    sag: baslangicKutu.sag + sdx,
    ust: baslangicKutu.ust + sdy,
    alt: baslangicKutu.alt + sdy,
  };
  const s = yapismaHesapla(hareketli, hedefKutular, YAPISMA_ESIGI);
  let ax = s.ax;
  let ay = s.ay;
  // Izgaraya yapışma: nesne yapışması OLMAYAN eksende ızgara çizgisine çek (TK-37 #2).
  if (izgaraEkran) {
    const g = izgaraYapis(
      { sol: hareketli.sol + ax, sag: hareketli.sag + ax, ust: hareketli.ust + ay, alt: hareketli.alt + ay },
      izgaraEkran.ox,
      izgaraEkran.oy,
      izgaraEkran.adimX,
      izgaraEkran.adimY,
      YAPISMA_ESIGI,
    );
    if (ax === 0) ax += g.ax;
    if (ay === 0) ay += g.ay;
  }
  return { dx: sdx + ax, dy: sdy + ay, kilavuzlar: s.kilavuzlar };
}

/**
 * Seç aracı (§9.2, varsayılan): tıkla-seç, Shift ile ekle/çıkar, sürükleyerek
 * seçili nesneleri TAŞI (canlı önizleme; bırakınca tek Command — §9.4), boşlukta
 * KEMENT (§9.7). Kilitli nesneler seçilemez/taşınamaz.
 */
const secAraci: Arac = {
  id: "sec",
  etiketAnahtari: "arac.sec",
  imlec: "default",
  sira: 0,
  ikon: svg`<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
    <path d="M3 2 L13 7.5 L8.4 8.4 L11 13 L9 13.8 L6.6 9 L3.2 11.6 Z" />
  </svg>`,

  bas(olay, baglam) {
    const leaf = baglam.isabet(olay);
    drillAday = null;
    if (!leaf) {
      basHedef = null;
      kementBas = { x: olay.clientX, y: olay.clientY };
      kementAktif = false;
      return;
    }
    kementBas = null;
    const belge = baglam.depo.belge;
    // En dıştaki grup KİLİTLİyse gruba terfi etme (kilitli grup sürüklemeyle
    // taşınamamalı; §9.7) → leaf davranışına düş.
    const grupHam = belge ? enDistakiGrup(belge, leaf) : null;
    const grupDis = grupHam && !grupHam.kilitli ? grupHam : null;
    const ref = baglam.secim.secili;

    // Grup SEÇİLİ iken içine basma (TK-21): sürüklenirse GRUP taşınır (taşıma
    // grubun tamamına etkiler), tıklanırsa nesneye İNİLİR (drill). Seçimi şimdi
    // değiştirme; karar release'te (tikla vs sürükleme) verilir.
    if (belge && grupDis && ref === grupDis) {
      drillAday = leaf;
      basHedef = leaf;
      if (olay.shiftKey) return;
      tasimaHazirla(baglam, olay); // mevcut seçim = grup
      return;
    }

    // Grup-duyarlı hedef: gruba aitse ve bağlam o grup İÇİNDE değilse EN DIŞTAKİ
    // grup; grup içindeyken (bir çocuk seçiliyken) tıklanan nesnenin kendisi.
    let hedef: Dugum = leaf;
    if (belge && grupDis)
      hedef = ref && atasiMi(belge, grupDis, ref) ? leaf : grupDis;
    basHedef = hedef; // tıklama çözümü için sakla
    if (olay.shiftKey) return; // Shift: tikla toggle yapacak, taşıma yok
    if (!baglam.secim.icindeMi(hedef)) baglam.secim.sec(hedef);
    tasimaHazirla(baglam, olay);
  },

  surukle(olay, baglam) {
    if (tasiBas) {
      const sdx = olay.clientX - tasiBas.x;
      const sdy = olay.clientY - tasiBas.y;
      if (!tasindi && Math.hypot(sdx, sdy) <= SURUKLEME_ESIGI) return;
      tasindi = true;
      drillAday = null; // sürükleme başladı → drill iptal (grup/mevcut seçim taşınır)
      const { dx, dy, kilavuzlar } = yapismaUygula(sdx, sdy, olay.altKey);
      for (const a of asillar) {
        const el = baglam.eleman(a.dugum.kimlik);
        if (!el) continue;
        const d = ekranDeltaKullanici(a.ctm, dx, dy);
        el.setAttribute("transform", transformTasi(a.transform, d.x, d.y)); // canlı önizleme
      }
      baglam.kilavuzCiz(kilavuzlar); // akıllı kılavuzlar (görünüm durumu)
      return;
    }
    if (kementBas) {
      // Mikro-titreme kement başlatıp seçimi temizlemesin: eşiği aşınca aktif et.
      if (
        !kementAktif &&
        Math.hypot(olay.clientX - kementBas.x, olay.clientY - kementBas.y) <=
          SURUKLEME_ESIGI
      ) {
        return;
      }
      kementAktif = true;
      baglam.kementCiz(
        dortgen(kementBas, { x: olay.clientX, y: olay.clientY }),
      );
    }
  },

  birak(olay, baglam) {
    // Taşıma commit (tek Command).
    if (tasiBas) {
      if (tasindi) {
        const sdx = olay.clientX - tasiBas.x;
        const sdy = olay.clientY - tasiBas.y;
        const { dx, dy } = yapismaUygula(sdx, sdy, olay.altKey);
        const belge = baglam.depo.belge;
        if (belge) {
          const komutlar = asillar.map((a) => {
            const d = ekranDeltaKullanici(a.ctm, dx, dy);
            return new OznitelikDegistirKomutu(
              belge,
              a.dugum,
              "transform",
              transformTasi(a.transform, d.x, d.y),
            );
          });
          baglam.gecmis.calistir(new BilesikKomut("taşı", komutlar));
        }
      }
      baglam.kilavuzCiz([]); // kılavuzları temizle
      tasiBas = null;
      tasindi = false;
      asillar = [];
      baslangicKutu = null;
      hedefKutular = [];
      izgaraEkran = null;
      return;
    }
    // Kement.
    if (kementBas && kementAktif) {
      const k = dortgen(kementBas, { x: olay.clientX, y: olay.clientY });
      baglam.kementCiz(null);
      const tamIcinde = !olay.ctrlKey;
      const adaylar = nesneler(baglam).filter((d) => {
        const el = baglam.eleman(d.kimlik);
        if (!(el instanceof SVGGraphicsElement)) return false;
        const r = el.getBoundingClientRect();
        return tamIcinde ? icindeMi(r, k) : kesisir(r, k);
      });
      if (olay.shiftKey && olay.altKey)
        for (const a of adaylar) baglam.secim.ekle(a);
      else if (olay.shiftKey) for (const a of adaylar) baglam.secim.degistir(a);
      else baglam.secim.cokluSec(adaylar);
    }
    kementBas = null;
    kementAktif = false;
  },

  tikla(olay, baglam) {
    // Grup içine drill (sürükleme olmadan release): adayı seç (TK-21). Shift olsa
    // bile DÜZ seç (replace) — yoksa grup + çocuğu aynı anda seçili kalır (atası
    // ile çocuğu birlikte seçmek çift-dönüşüm riski yaratır).
    if (drillAday) {
      const d = drillAday;
      drillAday = null;
      baglam.secim.sec(d);
      return;
    }
    // Release'te yeniden isabet ETME — basış anındaki hedefi kullan (release,
    // seçimle beliren tutamaçların üstüne düşüp seçimi silebilir).
    const hedef = basHedef;
    if (hedef) {
      if (olay.shiftKey) {
        baglam.secim.degistir(hedef);
      } else if (
        baglam.secim.icindeMi(hedef) &&
        baglam.secim.secililer.length > 1
      ) {
        // §9.6(b): çoklu seçimde, ZATEN SEÇİLİ bir nesneye modifiersiz tıklamak
        // seçimi BOZMAZ; o nesneyi etkin REFERANS (son seçilen) yapar. `ekle`
        // düğümü sona taşır → SecimDeposu.secili artık o; hizalama referansı
        // (son-secilen/anahtar değil — son-secilen) ona kayar.
        baglam.secim.ekle(hedef);
      }
      // Aksi halde nesne bas()'ta zaten (tek) seçildi — seçimi koru.
    } else if (!olay.shiftKey) {
      baglam.secim.temizle();
    }
  },

  // Ok tuşlarıyla nudge: belge birimiyle 1 (Shift ×10), her basış tek Command (§9.4).
  tus(olay, baglam) {
    const adim = olay.shiftKey ? 10 : 1;
    let dx = 0;
    let dy = 0;
    if (olay.key === "ArrowLeft") dx = -adim;
    else if (olay.key === "ArrowRight") dx = adim;
    else if (olay.key === "ArrowUp") dy = -adim;
    else if (olay.key === "ArrowDown") dy = adim;
    else return;
    const belge = baglam.depo.belge;
    // Kilitli düğümler klavyeyle de taşınamaz (§9.7) — Katmanlar'dan seçilse bile.
    const secililer = baglam.secim.secililer.filter((d) => !d.kilitli);
    if (!belge || secililer.length === 0) return;
    olay.preventDefault();
    const komutlar = secililer.map(
      (d) =>
        new OznitelikDegistirKomutu(
          belge,
          d,
          "transform",
          transformTasi(d.oznitelikler.get("transform") ?? "", dx, dy),
        ),
    );
    baglam.gecmis.calistir(new BilesikKomut("taşı", komutlar));
  },

  pasiflesti(baglam) {
    // Araç değişiminde kalan tüm geçici durumu temizle (görünüm durumu) —
    // yarım kalmış taşıma/kement/drill bir sonraki sefere sızmasın (#7).
    baglam.kilavuzCiz([]);
    baglam.kementCiz(null);
    baslangicKutu = null;
    hedefKutular = [];
    izgaraEkran = null;
    drillAday = null;
    tasiBas = null;
    tasindi = false;
    asillar = [];
    kementBas = null;
    kementAktif = false;
  },
};

aracKayitDefteri.kaydet(secAraci);
