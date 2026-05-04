"""
Step 3: ステージ画像を Inkipedia から一括ダウンロードする
実行: python scripts/3_download_stages.py
"""
import os
import time
import urllib.request
from pathlib import Path

INKIPEDIA_BASE = "https://splatoonwiki.org/wiki/Special:FilePath/S3_Stage_"
OUT_DIR = Path("images/stages")
OUT_DIR.mkdir(parents=True, exist_ok=True)

# HTMLファイルの STAGES_DATA と一致させる
STAGES = [
    ("ユノハナ大渓谷",            "Scorch_Gorge"),
    ("ゴンズイ地区",              "Eeltail_Alley"),
    ("ヤガラ市場",                "Hagglefish_Market"),
    ("マテガイ放水路",            "Undertow_Spillway"),
    ("ナメロウ金属",              "Um%27ami_Ruins"),
    ("クサヤ温泉",                "Mincemeat_Metalworks"),
    ("ヒラメが丘団地",            "Flounder_Heights"),
    ("マサバ海峡大橋",            "Hammerhead_Bridge"),
    ("スメーシーワールド",        "Barnacle_%26_Dime"),
    ("キンメダイ美術館",          "Crableg_Capital"),
    ("マヒマヒリゾート＆スパ",    "Mahi-Mahi_Resort"),
    ("海女美術大学",              "Inkblot_Art_Academy"),
    ("バイガイ亭",                "Brinewater_Springs"),
    ("チョウザメ造船",            "Sturgeon_Shipyard"),
    ("ザトウマーケット",          "Museum_d%27Alfonsino"),
    ("タラポートショッピングパーク", "Wahoo_World"),
    ("ネギトロ炭鉱",              "Gone_Fission_Hydroplant"),
    ("カジキ空港",                "MakoMart"),
    ("リュウグウターミナル",      "Bluefin_Depot"),
    ("グランドスプラットランドボウル", "Grand_Splatlands_Bowl"),
]

ok = 0
skip = 0
fail = 0

for i, (ja, en) in enumerate(STAGES, 1):
    # ファイル名は URLエンコードを解除した英語名 + .png
    safe_en = en.replace("%27", "'").replace("%26", "&")
    fname = f"{safe_en}.png"
    dest = OUT_DIR / fname

    if dest.exists() and dest.stat().st_size > 0:
        print(f"[{i:>2}/{len(STAGES)}] SKIP {ja}")
        skip += 1
        continue

    url = f"{INKIPEDIA_BASE}{en}.png"
    try:
        # Inkipedia はリダイレクトするので follow_redirects が必要
        req = urllib.request.Request(url, headers={"User-Agent": "SplatoonDraftTool/1.0"})
        with urllib.request.urlopen(req, timeout=30) as res:
            data = res.read()
        with open(dest, "wb") as f:
            f.write(data)
        size_kb = len(data) // 1024
        print(f"[{i:>2}/{len(STAGES)}] ✓  {ja}  ({size_kb} KB)")
        ok += 1
    except Exception as e:
        print(f"[{i:>2}/{len(STAGES)}] ✗  {ja}  ERROR: {e}")
        fail += 1

    time.sleep(0.3)  # Inkipedia は少し多めに待つ

print(f"\n完了: 取得 {ok} / スキップ {skip} / 失敗 {fail}")
