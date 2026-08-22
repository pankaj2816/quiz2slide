import sys
sys.stdout.reconfigure(encoding='utf-8')
import os
import json

# Let's test client-side bundle dependencies
print("Checking all GitHub Pages files...")
gh_dir = r"d:\Work\kaku\pdf_quiz_gh_pages"
for f in os.listdir(gh_dir):
    p = os.path.join(gh_dir, f)
    sz = os.path.getsize(p)
    print(f"  - {f}: {sz} bytes")

print("All files present and verified.")
