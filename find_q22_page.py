import sys
sys.stdout.reconfigure(encoding='utf-8')
import pymupdf

doc = pymupdf.open(r'd:\Work\kaku\QUIZ.pdf')

for pno, p in enumerate(doc, 1):
    txt = p.get_text()
    if 'Region X' in txt or 'diagram below' in txt:
        print(f"FOUND Q22 ON PAGE {pno} (0-indexed {pno - 1})!")
