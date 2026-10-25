なんでも見れるVscodeの拡張機能を作成する

# 現状問題
- vscode でオフィス関連のファイル(word,excel) が編集できない、プレビューできない
- PDF も拡張機能を入れないと表示できない
- Webサイトもログイン状態で見ることができない

# 解決策
- https://github.com/ibisjp/ibis-office を用いてオフィスのプレビューアンド編集をローカルでできるようにする
- PDFもwebviewでレンダリングする
- 普通のブラウザのように使える webviewを用意する

# セキュリティ
- 外部へのアップロードなどは一切発生しない形にする (webサイトは別)
- このwebviewから端末を攻撃できないようにする

ファイルに関しては開くだけで自動で表示されるようにしたい
技術は react tailwind typescript でいいかな

# ライセンス
- このリポジトリは AGPL-3.0-only (LICENSE)。配布する場合は対応するソースも提供すること。
- Office の表示・編集は [ibisOffice](https://github.com/ibisjp/ibis-office) (AGPL-3.0-only / 商用デュアルライセンス, Copyright (c) ibis inc.) を使用している。**Powered by ibisOffice** (`Office Edit: About` コマンドに表示)。名称・ロゴは ibis inc. の商標で、使い方は ibis-office の `docs/TRADEMARK.md` に従う。
- ibisOffice への変更は `patches/ibis-office/` のパッチとして管理 (詳細は同ディレクトリの README.md)。
- 同梱ライセンス: `licenses/`
