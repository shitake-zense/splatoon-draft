"""
Step 1: stat.ink API から武器データを取得して weapons.json に保存する
実行: python scripts/1_fetch_weapons.py
"""
import json
import urllib.request

STAT_API = "https://stat.ink/api/v3/weapon"

TYPE_NAMES = {
    "shooter":   "シューター",
    "blaster":   "ブラスター",
    "roller":    "ローラー",
    "brush":     "フデ",
    "charger":   "チャージャー",
    "slosher":   "スロッシャー",
    "splatling": "スピナー",
    "maneuver":  "マニューバー",
    "brella":    "シェルター",
    "stringer":  "ストリンガー",
    "wiper":     "ワイパー",
}

print("stat.ink から武器データを取得中...")
with urllib.request.urlopen(STAT_API, timeout=30) as res:
    raw = json.loads(res.read().decode())

valid_types = set(TYPE_NAMES.keys())
weapons = []
for w in raw:
    if not w.get("name") or not w["name"].get("ja_JP"):
        continue
    if not w.get("type") or w["type"]["key"] not in valid_types:
        continue
    weapons.append({
        "key":    w["key"],
        "name":   w["name"]["ja_JP"],
        "cat":    TYPE_NAMES[w["type"]["key"]],
        "imgFile": f"Path_Wst_{w['main']}.png",  # ローカルファイル名
    })

with open("data/weapons.json", "w", encoding="utf-8") as f:
    json.dump(weapons, f, ensure_ascii=False, indent=2)

print(f"✓ {len(weapons)} 種の武器を data/weapons.json に保存しました")
