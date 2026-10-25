#!/usr/bin/env bash
# vendor/ibis-office を UPSTREAM_REF に合わせ、patches/ibis-office/*.patch を当てて web ビルド (WASM) を作る。
# 要: nightly Rust (wasm_thread が要求) + wasm32-unknown-unknown,
#     wasm-bindgen-cli 0.2.128 (cargo install wasm-bindgen-cli --version 0.2.128 --locked)
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
vendor="$root/vendor/ibis-office"
patches="$root/patches/ibis-office"

[[ -d "$vendor/.git" ]] || git clone https://github.com/ibisjp/ibis-office "$vendor"
ref="$(tr -d '[:space:]' < "$patches/UPSTREAM_REF")"
git -C "$vendor" fetch --quiet origin "$ref" 2>/dev/null || true
git -C "$vendor" checkout --quiet "$ref"
git -C "$vendor" submodule update --init --depth 1

# 前回のパッチを外して upstream の状態に戻してから、順に当てる (何度実行しても同じ結果)
git -C "$vendor" checkout --quiet -- crates www
for p in "$patches"/*.patch; do
  echo "apply $(basename "$p")"
  git -C "$vendor" apply --whitespace=nowarn "$p"
done

cd "$vendor"
[[ -d node_modules ]] || npm ci
RUSTUP_TOOLCHAIN=nightly scripts/build-web.sh --release
