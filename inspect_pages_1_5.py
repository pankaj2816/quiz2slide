import sys
sys.stdout.reconfigure(encoding='utf-8')
import pymupdf

doc = pymupdf.open(r"d:\Work\kaku\test_output\input_pdf.pdf")
for i in range(5):
    print(f"=== PAGE {i+1} ===")
    print(doc[i].get_text())
