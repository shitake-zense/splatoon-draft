"""
Step 2 (修正版): 武器画像を leanny から一括ダウンロードする
  英語名を使って stat.ink の武器 ↔ leanny のファイル名を照合する
実行: py scripts/2_download_images.py
"""
import json
import time
import urllib.request
from pathlib import Path

LEANNY_BASE  = "https://leanny.github.io/splat3/"
WEAPON_INFO  = LEANNY_BASE + "data/mush/100/WeaponInfoMain.json"
LANG_EN      = LEANNY_BASE + "data/language/EUen_full.json"
IMG_BASE     = LEANNY_BASE + "images/weapon_flat/Path_Wst_"
STAT_API     = "https://stat.ink/api/v3/weapon"
OUT_DIR      = Path("images/weapons")
OUT_DIR.mkdir(parents=True, exist_ok=True)

TYPE_NAMES = {
    "shooter":"シューター","blaster":"ブラスター","roller":"ローラー",
    "brush":"フデ","charger":"チャージャー","slosher":"スロッシャー",
    "splatling":"スピナー","maneuver":"マニューバー","brella":"シェルター",
    "stringer":"ストリンガー","wiper":"ワイパー",
}

# ── 1. leanny 英語名 → RowId マッピングを作成 ──────────────────────────
print("leanny 言語ファイルを取得中...")
with urllib.request.urlopen(LANG_EN, timeout=30) as r:
    lang = json.loads(r.read())

wnames = lang.get("CommonMsg/Weapon/WeaponName_Main", {})

# マルチプレイヤー武器のみ対象 (Coop/Msn/Bear/Rival/Sdodr を除外)
EXCLUDE_SUFFIX = ("_Coop", "_Msn", "_Bear", "_Sdodr")
EXCLUDE_PART   = ("Rival",)

def is_multiplayer(row_id: str) -> bool:
    if any(row_id.endswith(s) for s in EXCLUDE_SUFFIX):
        return False
    if any(p in row_id for p in EXCLUDE_PART):
        return False
    return True

# 英語名(小文字) → RowId  （同名が複数ある場合は最初の _00 を優先）
en_to_rowid: dict[str, str] = {}
for row_id, en_name in wnames.items():
    if not is_multiplayer(row_id):
        continue
    key = en_name.strip().lower()
    # _00 を優先して登録（デコ違いで同名の場合は後から上書きしない）
    if key not in en_to_rowid or row_id.endswith("_00"):
        en_to_rowid[key] = row_id

print(f"  leanny マルチ武器エントリ: {len(en_to_rowid)}")

# ── 2. stat.ink から武器一覧を取得 ────────────────────────────────────
print("stat.ink から武器データを取得中...")
with urllib.request.urlopen(STAT_API, timeout=30) as r:
    stat_weapons = json.loads(r.read())

valid_types = set(TYPE_NAMES.keys())
weapons = [w for w in stat_weapons
           if w.get("name", {}).get("ja_JP")
           and w.get("type", {}).get("key") in valid_types]
print(f"  stat.ink 対象武器数: {len(weapons)}")

# ── 3. 英語名で照合 ────────────────────────────────────────────────────
matched   = {}   # stat.ink key → leanny RowId
unmatched = []

for w in weapons:
    en_name = w["name"].get("en_US", "").strip().lower()
    if en_name in en_to_rowid:
        matched[w["key"]] = en_to_rowid[en_name]
    else:
        unmatched.append((w["key"], w["name"].get("en_US", "")))

print(f"\n照合結果: マッチ {len(matched)} / 未マッチ {len(unmatched)}")
if unmatched:
    print("── 未マッチ武器 ──")
    for key, name in unmatched:
        print(f"  {key:30s} | {name}")

# ── 4. weapons.json を RowId ベースのimgFileで更新 ──────────────────────
updated = []
for w in weapons:
    row_id = matched.get(w["key"])
    img_file = f"Path_Wst_{row_id}.png" if row_id else "Dummy.png"
    updated.append({
        "key":     w["key"],
        "name":    w["name"]["ja_JP"],
        "cat":     TYPE_NAMES[w["type"]["key"]],
        "imgFile": img_file,
    })

with open("data/weapons.json", "w", encoding="utf-8") as f:
    json.dump(updated, f, ensure_ascii=False, indent=2)
print(f"\nweapons.json を更新しました ({len(updated)} 種)\n")

# ── 5. ユニーク画像をダウンロード ─────────────────────────────────────
unique_files = sorted({w["imgFile"] for w in updated if w["imgFile"] != "Dummy.png"})
print(f"画像ダウンロード開始 (ユニーク {len(unique_files)} 枚)")

ok = skip = fail = 0
for i, fname in enumerate(unique_files, 1):
    dest = OUT_DIR / fname
    if dest.exists() and dest.stat().st_size > 0:
        skip += 1
        continue

    base = fname.removeprefix("Path_Wst_").removesuffix(".png")
    url  = f"{IMG_BASE}{base}.png"
    try:
        urllib.request.urlretrieve(url, dest)
        size_kb = dest.stat().st_size // 1024
        print(f"[{i:>3}/{len(unique_files)}] ✓  {fname}  ({size_kb}KB)")
        ok += 1
    except Exception as e:
        print(f"[{i:>3}/{len(unique_files)}] ✗  {fname}  {e}")
        fail += 1
    time.sleep(0.1)

print(f"\n完了: 取得 {ok} / スキップ {skip} / 失敗 {fail}")
if fail:
    print("再実行すると失敗分だけ再試行されます")
