"""
Step 4: サブ/スペシャルのアイコン画像を leanny から取得して images/subspe/ に同梱する
  - 既存の武器画像と同様「ローカル同梱」方式（実行時 fetch はしない）
  - 画像URL: https://leanny.github.io/splat3/images/subspe/Wsb_{RowId}00.png（サブ）
            https://leanny.github.io/splat3/images/subspe/Wsp_{RowId}00.png（スペシャル）
  - 日本語名→RowId は leanny の WeaponInfoSub/Special.json（Type=Versus）から作成
実行: py scripts/4_download_subspecial.py
"""
import json
import time
import urllib.request
from pathlib import Path

VER       = "920"
BASE      = "https://leanny.github.io/splat3/"
SUB_DATA  = BASE + f"data/mush/{VER}/WeaponInfoSub.json"
SPE_DATA  = BASE + f"data/mush/{VER}/WeaponInfoSpecial.json"
IMG_BASE  = BASE + "images/subspe/"
OUT_DIR   = Path("images/subspe")
OUT_DIR.mkdir(parents=True, exist_ok=True)

# weapons.json に実在するサブ/スペシャル名だけを対象にする
with open("data/weapons.json", encoding="utf-8") as f:
    weapons = json.load(f)
used_subs     = {w["sub"]     for w in weapons if w.get("sub")}
used_specials = {w["special"] for w in weapons if w.get("special")}


def fetch_json(url):
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def name_to_rowid(url):
    return {w["Label"]: w["__RowId"] for w in fetch_json(url) if w.get("Type") == "Versus"}


sub_map = name_to_rowid(SUB_DATA)
spe_map = name_to_rowid(SPE_DATA)

targets = []  # (prefix, name, rowid)
for name in sorted(used_subs):
    if name not in sub_map:
        print(f"!! サブ未対応: {name}")
        continue
    targets.append(("Wsb_", name, sub_map[name]))
for name in sorted(used_specials):
    if name not in spe_map:
        print(f"!! スペシャル未対応: {name}")
        continue
    targets.append(("Wsp_", name, spe_map[name]))

print(f"対象: サブ {len(used_subs)} / スペシャル {len(used_specials)} → DL {len(targets)} 枚\n")

ok = skip = fail = 0
name_to_file = {}
for i, (prefix, name, rowid) in enumerate(targets, 1):
    fname = f"{prefix}{rowid}00.png"
    name_to_file[name] = fname
    dest = OUT_DIR / fname
    if dest.exists() and dest.stat().st_size > 0:
        skip += 1
        continue
    url = f"{IMG_BASE}{fname}"
    try:
        urllib.request.urlretrieve(url, dest)
        print(f"[{i:>2}/{len(targets)}] OK  {name} -> {fname}")
        ok += 1
    except Exception as e:
        print(f"[{i:>2}/{len(targets)}] NG  {name} -> {fname}  {e}")
        fail += 1
    time.sleep(0.1)

print(f"\n完了: 取得 {ok} / スキップ {skip} / 失敗 {fail}")

# index.html に貼る用の name->imgFile マップを出力
print("\n--- name -> imgFile (for index.html const) ---")
print(json.dumps(name_to_file, ensure_ascii=False, indent=2))
