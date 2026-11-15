"""Sendou.ink の公開リポジトリからステージ画像を取得する。

画像の再利用許諾や任天堂の権利が解決済みであることを意味しません。
実行: python scripts/3_download_stages.py
"""
import time
import urllib.request
from pathlib import Path

BASE = "https://raw.githubusercontent.com/sendou-ink/assets/main/assets/img/stages"
OUT_DIR = Path("images/sendou-stages")
OUT_DIR.mkdir(parents=True, exist_ok=True)

failed = []
for stage_id in range(25):
    dest = OUT_DIR / f"{stage_id}.avif"
    if dest.exists() and dest.stat().st_size:
        print(f"SKIP {dest}")
        continue
    try:
        request = urllib.request.Request(f"{BASE}/{stage_id}.avif", headers={"User-Agent": "SplatoonDraftTool/1.0"})
        with urllib.request.urlopen(request, timeout=30) as response:
            data = response.read()
        if not data or b"ftypavif" not in data[:32]:
            raise ValueError("AVIF 画像ではありません")
        dest.write_bytes(data)
        print(f"OK {dest} ({len(data)} bytes)")
    except Exception as exc:
        print(f"ERROR {dest}: {exc}")
        failed.append(stage_id)
    time.sleep(0.1)

if failed:
    raise SystemExit(f"取得失敗: {failed}")
