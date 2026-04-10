#!/usr/bin/env bash
# E2E test: build naruto PKGBUILD from local source, install, verify, uninstall.
# Must run as non-root user with sudo access on Arch Linux.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="$(mktemp -d)"
trap 'rm -rf "$BUILD_DIR"' EXIT

echo ":: Preparing build directory..."
cp "$SCRIPT_DIR/PKGBUILD" "$BUILD_DIR/"

# Patch PKGBUILD to use local source instead of GitHub tarball
cd "$BUILD_DIR"
sed -i "s|source=.*|source=()|" PKGBUILD
sed -i "s|sha256sums=.*|sha256sums=()|" PKGBUILD
sed -i "s|cd \"\$srcdir/blop-\$pkgver\"|cd \"$SCRIPT_DIR\"|g" PKGBUILD

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
