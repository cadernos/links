#!/usr/bin/env python3
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public"
FILES = ["index.html", "styles.css", "app.js", "_headers", ".nojekyll"]
DIRS = ["assets", "data", "admin"]

if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir()
for name in FILES:
    shutil.copy2(ROOT / name, OUT / name)
for name in DIRS:
    shutil.copytree(ROOT / name, OUT / name)
print(f"Build público criado em {OUT}")
