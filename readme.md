# Office Edit

Word / Excel / PowerPoint / PDF を、VS Code の中だけで **ローカルに表示・編集** できる拡張機能です。

ファイルを開くだけで自動的に表示されます。追加の拡張機能は不要です。

## 背景

- VS Code では Office ファイル (Word, Excel) の編集・プレビューができない
- PDF も拡張機能を入れないと表示できない

## 機能

| 形式 | 拡張子 | 内容 |
| --- | --- | --- |
| Word / Excel / PowerPoint | `.docx` `.xlsx` `.pptx` | プレビュー + 編集 ([ibisOffice](https://github.com/ibisjp/ibis-office) を利用) |
| PDF | `.pdf` | webview 上でレンダリング |

### コマンド

| コマンド | 説明 |
| --- | --- |
| `Office Edit: About (Powered by ibisOffice)` | バージョン・ライセンス情報を表示 |
| `Office Edit: Set as Default Viewer (docx/xlsx/pptx/pdf)` | 既定のビューアとして設定 |
| `Office Edit: Reset Default Viewer Settings` | 既定ビューアの設定をリセット |

## セキュリティ

- 外部へのアップロード・通信は一切発生しない
- webview から端末を攻撃できない構成にする

## 技術スタック

- TypeScript / React / Tailwind CSS
- esbuild (ビルド)
- Office 表示・編集: [ibis-office](https://github.com/ibisjp/ibis-office) (git submodule: `vendor/ibis-office`)

## ディレクトリ構成

```
packages/
  extension/        拡張機能本体
  feature-office/   Office ビューア / エディタ
  feature-pdf/      PDF ビューア
  shared/           共通コード
patches/ibis-office/  ibisOffice への変更パッチ
vendor/ibis-office/   ibisOffice (submodule)
licenses/             同梱ライセンス
samples/              動作確認用サンプル
scripts/              ビルドスクリプト
```

## 開発

```sh
git clone --recurse-submodules <このリポジトリ>
npm install

npm run build:ibis   # ibisOffice をビルド
npm run build        # 拡張機能をビルド
npm run watch        # ウォッチビルド
npm run typecheck    # 型チェック
npm run package      # .vsix を生成
```

## ライセンス

このリポジトリは **AGPL-3.0-only** ([LICENSE](LICENSE)) です。配布する場合は、対応するソースも提供してください。

### Powered by ibisOffice

Office の表示・編集には [ibisOffice](https://github.com/ibisjp/ibis-office) (AGPL-3.0-only / 商用デュアルライセンス, Copyright (c) ibis inc.) を使用しています。

- 名称・ロゴは ibis inc. の商標です。使い方は ibis-office の `docs/TRADEMARK.md` に従ってください。
- ibisOffice への変更は [patches/ibis-office/](patches/ibis-office/) のパッチとして管理しています (詳細は同ディレクトリの README.md)。
- 同梱ライセンス: [licenses/](licenses/)
