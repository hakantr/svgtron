import { test } from "node:test";
import assert from "node:assert/strict";
import { dugumOlustur, type Dugum } from "../model/dugum";
import { ReferansIndeksi } from "./referans-indeksi";
import { kaynakYenidenAdlandir } from "./referans-yeniden-adlandir";
import type { Belge } from "../belge";

/**
 * Güvenli yeniden adlandırma birim testleri — gerçek Belge/DOMParser yerine elle
 * kurulmuş Dugum ağacı + gerçek ReferansIndeksi + sahte belge ile.
 */

/** Sahte belge: rename modülünün kullandığı kok + referansIndeksi + bildir. */
function sahteBelge(kok: Dugum): Belge {
  let idx = new ReferansIndeksi(kok);
  return {
    kok,
    get referansIndeksi() {
      return idx;
    },
    bildir() {
      idx = new ReferansIndeksi(kok); // komut sonrası tazele
    },
  } as unknown as Belge;
}

test("url-kaynak yeniden adlandırma: tanım id + tüm atıflar güncellenir", () => {
  const grad = dugumOlustur("linearGradient", { id: "g1" });
  const rect = dugumOlustur("rect", { fill: "url(#g1)" });
  const kok = dugumOlustur("svg", {}, [dugumOlustur("defs", {}, [grad]), rect]);
  const belge = sahteBelge(kok);

  const sonuc = kaynakYenidenAdlandir(belge, "g1", "g2", false);
  assert.equal(sonuc.hata, undefined);
  assert.equal(sonuc.sayi, 1, "bir atıf güncellenmeli");
  sonuc.komut!.uygula();

  assert.equal(grad.oznitelikler.get("id"), "g2");
  assert.equal(rect.oznitelikler.get("fill"), "url(#g2)");

  sonuc.komut!.geriAl();
  assert.equal(grad.oznitelikler.get("id"), "g1");
  assert.equal(rect.oznitelikler.get("fill"), "url(#g1)");
});

test("url-kaynak: style ve href atıfları da güncellenir", () => {
  const filt = dugumOlustur("filter", { id: "f1" });
  const a = dugumOlustur("rect", { style: "filter: url(#f1); opacity: 0.5" });
  const b = dugumOlustur("use", { href: "#f1" });
  const kok = dugumOlustur("svg", {}, [dugumOlustur("defs", {}, [filt]), a, b]);
  const belge = sahteBelge(kok);

  const sonuc = kaynakYenidenAdlandir(belge, "f1", "f2", false);
  assert.equal(sonuc.sayi, 2);
  sonuc.komut!.uygula();
  assert.equal(filt.oznitelikler.get("id"), "f2");
  assert.match(a.oznitelikler.get("style")!, /filter:\s*url\(#f2\)/);
  assert.equal(b.oznitelikler.get("href"), "#f2");
});

test("sınıf yeniden adlandırma: <style> kuralı + class atıfları", () => {
  const style = dugumOlustur(
    "style",
    {},
    [],
    ".cls { fill: red; }\n.other { stroke: blue; }",
  );
  const rect = dugumOlustur("rect", { class: "cls other" });
  const kok = dugumOlustur("svg", {}, [
    dugumOlustur("defs", {}, [style]),
    rect,
  ]);
  const belge = sahteBelge(kok);

  const sonuc = kaynakYenidenAdlandir(belge, "cls", "cls2", true);
  assert.equal(sonuc.hata, undefined);
  assert.equal(sonuc.sayi, 1);
  sonuc.komut!.uygula();
  assert.match(style.metin!, /\.cls2\s*\{/);
  assert.doesNotMatch(style.metin!, /\.cls\s*\{/); // eski seçici kalmamalı
  assert.match(style.metin!, /\.other\s*\{/); // benzer-önekli sınıf etkilenmez
  assert.equal(rect.oznitelikler.get("class"), "cls2 other");
});

test("çakışma ve geçersiz ad reddedilir (komut null)", () => {
  const g1 = dugumOlustur("linearGradient", { id: "g1" });
  const g2 = dugumOlustur("linearGradient", { id: "g2" });
  const kok = dugumOlustur("svg", {}, [dugumOlustur("defs", {}, [g1, g2])]);
  const belge = sahteBelge(kok);

  assert.equal(kaynakYenidenAdlandir(belge, "g1", "g2", false).hata, "cakisma");
  assert.equal(
    kaynakYenidenAdlandir(belge, "g1", "1bad", false).hata,
    "gecersiz",
  );
  assert.equal(
    kaynakYenidenAdlandir(belge, "g1", "g1 g3", false).hata,
    "gecersiz",
  ); // boşluk
  assert.equal(kaynakYenidenAdlandir(belge, "g1", "g1", false).komut, null); // değişiklik yok
});

test("benzer önekli id yanlış eşleşmez (#g1 vs #g10)", () => {
  const g1 = dugumOlustur("linearGradient", { id: "g1" });
  const g10 = dugumOlustur("linearGradient", { id: "g10" });
  const r1 = dugumOlustur("rect", { fill: "url(#g1)" });
  const r10 = dugumOlustur("rect", { fill: "url(#g10)" });
  const kok = dugumOlustur("svg", {}, [
    dugumOlustur("defs", {}, [g1, g10]),
    r1,
    r10,
  ]);
  const belge = sahteBelge(kok);

  const sonuc = kaynakYenidenAdlandir(belge, "g1", "gX", false);
  assert.equal(sonuc.sayi, 1, "yalnız g1 atfı (g10 değil)");
  sonuc.komut!.uygula();
  assert.equal(r1.oznitelikler.get("fill"), "url(#gX)");
  assert.equal(r10.oznitelikler.get("fill"), "url(#g10)", "g10 etkilenmemeli");
});
