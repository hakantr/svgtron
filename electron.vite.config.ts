import { resolve } from "node:path";
import { defineConfig } from "electron-vite";

// electron-vite, üç süreci (main / preload / renderer) tek konfigürasyonla yönetir.
// Dizin yapısı AGENTS.md §4'e göre: kaynaklar src/ altında, çıktı out/ altında.
export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, "src/main/index.ts") },
      },
    },
  },
  preload: {
    build: {
      rollupOptions: {
        // Çıktı adı (kopru.js) anahtar adından gelir; pencere.ts bu adı yükler.
        input: { kopru: resolve(__dirname, "src/preload/kopru.ts") },
      },
    },
  },
  renderer: {
    // Renderer kökü; index.html ve UI kaynakları burada.
    root: "src/renderer",
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, "src/renderer/index.html") },
      },
    },
  },
});
