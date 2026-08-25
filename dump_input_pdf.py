import sys
sys.stdout.reconfigure(encoding='utf-8')
import pymupdf
import re

pdf_path = r"d:\Work\kaku\test_output\input_pdf.pdf"
doc = pymupdf.open(pdf_path)
print(f"Loaded {pdf_path}, Total pages: {len(doc)}")

for pno in range(len(doc)):
    page = doc[pno]
    text = page.get_text()
    print(f"\n==================== PAGE {pno+1} ====================")
    print(text)
