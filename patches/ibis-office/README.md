# ibis-office パッチ

`vendor/ibis-office` は upstream のまま触らず、変更はここのパッチで当てる。
`scripts/build-ibis.sh` が upstream を `UPSTREAM_REF` に合わせ、`*.patch` を順に適用してビルドする。

| パッチ | 内容 |
|---|---|
| 0001-browser-save-hook | ブラウザ版で未実装だった保存 (⌘S / 名前を付けて保存) を、ページ側のフック `window.ibisOfficeSaveFile(name, bytes, saveAs)` に渡す。起動時に渡したファイルも `source` を保持して開く |

## upstream を更新するとき
1. `git -C vendor/ibis-office fetch && git -C vendor/ibis-office checkout <新しい ref>`
2. `scripts/build-ibis.sh` を実行。パッチが当たらなければ、そのパッチだけ作り直す
3. `git -C vendor/ibis-office rev-parse HEAD > patches/ibis-office/UPSTREAM_REF`

## パッチの作り直し
`vendor/ibis-office` を直接編集して動作確認 → `git -C vendor/ibis-office diff -- crates > patches/ibis-office/<name>.patch` → `git -C vendor/ibis-office checkout -- crates`
