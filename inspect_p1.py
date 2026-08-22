import sys
sys.stdout.reconfigure(encoding='utf-8')
import pymupdf

doc = pymupdf.open(r'd:\Work\kaku\QUIZ.pdf')
p1 = doc[0]
print("--- PAGE 1 RAW TEXT ---")
print(p1.get_text())

print("--- PAGE 1 DICT BLOCKS ---")
for b in p1.get_text("dict")["blocks"]:
    if b.get("type") == 0:
        for l in b["lines"]:
            spans_txt = " | ".join(s["text"] for s in l["spans"])
            print(f"y={l['bbox'][1]:.1f} : {spans_txt}")
