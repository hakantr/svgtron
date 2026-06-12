#!/usr/bin/env bash
# SVG Editör — Linux dock/görev çubuğu ikonunu kurar.
#
# Neden gerekli: Wayland'de (GNOME/COSMIC) pencerelerin ikonu pencere
# özelliğiyle değil, pencerenin app_id'sinin bir `.desktop` dosyasıyla
# eşleşmesiyle belirlenir. Uygulama app_id'sini 'svgtron' olarak sabitler
# (bkz. src/main/index.ts); bu betik de eşleşen `.desktop`'u Icon=amblem ile
# kullanıcı uygulama dizinine kurar. Geliştirme (npm run dev) için yeterlidir;
# paketlemede (electron-builder) bu iş otomatik yapılacaktır.
set -euo pipefail

# Repo kökü = bu betiğin bir üst dizini.
KOK="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IKON="$KOK/resources/amblem.png"
HEDEF_DIZIN="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
HEDEF="$HEDEF_DIZIN/svgtron.desktop"

mkdir -p "$HEDEF_DIZIN"
cat > "$HEDEF" <<EOF
[Desktop Entry]
Type=Application
Name=SVG Editör
Comment=SVG Editör & Animasyon Gözlemleyici
Exec=sh -c "cd '$KOK' && npm run dev"
Path=$KOK
Icon=$IKON
Terminal=false
Categories=Graphics;Development;
StartupWMClass=svgtron
EOF

# Önbelleği tazele (varsa).
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$HEDEF_DIZIN" >/dev/null 2>&1 || true
fi

echo "Kuruldu: $HEDEF"
echo "Icon:    $IKON"
