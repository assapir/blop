#!/usr/bin/env bash
# E2E test: build naruto PKGBUILD from local source, install, verify, uninstall.
# Must run as non-root user with sudo access on Arch Linux.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="$(mktemp -d)"
trap 'rm -rf "$BUILD_DIR"' EXIT

echo ":: Preparing build directory..."

# Write a minimal PKGBUILD that packages from local source
cat > "$BUILD_DIR/PKGBUILD" <<EOF
pkgname=naruto
pkgver=0.1.0
pkgrel=1
pkgdesc="Smart AUR helper CLI for Arch Linux"
arch=('x86_64' 'aarch64')
license=('GPL-3.0-or-later')
depends=('nodejs')
makedepends=('npm')

build() {
  cd "$SCRIPT_DIR"
  npm install --omit=dev
}

package() {
  cd "$SCRIPT_DIR"
  install -dm755 "\$pkgdir/usr/lib/\$pkgname"
  cp -r src node_modules package.json "\$pkgdir/usr/lib/\$pkgname/"
  chmod +x "\$pkgdir/usr/lib/\$pkgname/src/bin.ts"
  install -dm755 "\$pkgdir/usr/bin"
  ln -s "/usr/lib/\$pkgname/src/bin.ts" "\$pkgdir/usr/bin/\$pkgname"
}
EOF

cd "$BUILD_DIR"

echo ":: Building package..."
makepkg -sf --noconfirm

echo ":: Installing package..."
sudo pacman -U --noconfirm naruto-*.pkg.tar.*

echo ":: Verifying installation..."
naruto --help | grep -q "Usage: naruto" || { echo "FAIL: --help output missing"; exit 1; }
echo "PASS: naruto --help works"

echo ":: Uninstalling..."
sudo pacman -Rns --noconfirm naruto

echo ":: Verifying removal..."
if command -v naruto &>/dev/null; then
  echo "FAIL: naruto still available after uninstall"
  exit 1
fi
echo "PASS: naruto removed"

echo ":: E2E test passed!"
