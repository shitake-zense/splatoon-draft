# Splatoon Draft Tool

スプラトゥーン3 プライベートマッチ用ドラフトツール

## リポジトリ構成

```
splatoon-draft/
├── index.html            ← メインアプリ（ローカルファイル参照版）
├── data/
│   └── weapons.json      ← 武器データ（スクリプトで生成）
├── images/
│   ├── weapons/          ← 武器アイコン（スクリプトで取得）
│   └── stages/           ← ステージ画像（スクリプトで取得）
└── scripts/
    ├── 1_fetch_weapons.py     ← 武器データをAPIから取得してJSON保存
    ├── 2_download_images.py   ← 武器画像を一括ダウンロード
    └── 3_download_stages.py   ← ステージ画像を一括ダウンロード
```

---

## 初回セットアップ（画像・データの取得）

Python 3.8 以上があれば追加ライブラリ不要です。

```bash
# 1. 武器データを取得（data/weapons.json を生成）
python scripts/1_fetch_weapons.py

# 2. 武器画像を一括ダウンロード（images/weapons/ に保存）
#    約200枚・数分かかります
python scripts/2_download_images.py

# 3. ステージ画像を一括ダウンロード（images/stages/ に保存）
#    20枚・1〜2分
python scripts/3_download_stages.py
```

スクリプトは途中で止まっても再実行できます（取得済みファイルはスキップ）。

---

## ローカルで動作確認

HTMLファイルは `fetch("data/weapons.json")` を使っているため、  
**ダブルクリックで開くと CORS エラーになります**。  
簡易サーバーを立てて確認してください。

```bash
# Python が入っていれば一行で OK
python -m http.server 8080

# → ブラウザで http://localhost:8080 を開く
```

---

## GitHub Pages へのデプロイ

1. GitHubで新しいリポジトリを作成
2. このフォルダをプッシュ

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/<あなたのユーザー名>/<リポジトリ名>.git
git push -u origin main
```

3. リポジトリの Settings → Pages → Branch: `main` / `/(root)` → Save  
4. しばらく待つと `https://<ユーザー名>.github.io/<リポジトリ名>/` で公開されます

---

## 武器データの更新

新しい武器が追加されたときは以下を再実行してプッシュするだけです。

```bash
python scripts/1_fetch_weapons.py
python scripts/2_download_images.py  # 新規画像だけ取得される
git add data/weapons.json images/weapons/
git commit -m "update weapons"
git push
```

---

## 次のステップ：マルチプレイヤー化（Firebase）

Phase 2 以降では Firebase Realtime Database を追加して、  
部屋番号で最大8人がリアルタイムにドラフトを共有できるようにします。
