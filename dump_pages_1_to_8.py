import sys
sys.stdout.reconfigure(encoding='utf-8')
import pymupdf

doc = pymupdf.open(r"d:\Work\kaku\test_output\input_pdf.pdf")

for pno in range(8):
    page = doc[pno]
    text = page.get_text("text")
    print(f"\n==================== PAGE {pno + 1} ====================")
    print(text.strip())
