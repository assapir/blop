# Maintainer: Assaf Sapir <assaf@example.com>
pkgname=naruto
pkgver=0.1.0
pkgrel=1
pkgdesc="Smart AUR helper CLI for Arch Linux (node + aur + naruto)"
arch=('x86_64' 'aarch64')
url="https://github.com/assapir/blop"
license=('GPL-3.0-or-later')
depends=('nodejs')
makedepends=('npm' 'git')
source=("$pkgname-$pkgver.tar.gz::$url/archive/v$pkgver.tar.gz")
sha256sums=('SKIP')

build() {
  cd "$srcdir/blop-$pkgver"
  npm install --omit=dev
}

package() {
  cd "$srcdir/blop-$pkgver"
  install -dm755 "$pkgdir/usr/lib/$pkgname"
  cp -r src node_modules package.json "$pkgdir/usr/lib/$pkgname/"
  chmod +x "$pkgdir/usr/lib/$pkgname/src/bin.ts"
  install -dm755 "$pkgdir/usr/bin"
  ln -s "/usr/lib/$pkgname/src/bin.ts" "$pkgdir/usr/bin/$pkgname"
}
