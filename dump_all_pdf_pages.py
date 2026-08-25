import sys
sys.stdout.reconfigure(encoding='utf-8')
import pymupdf

doc = pymupdf.open(r"d:\Work\kaku\test_output\input_pdf.pdf")

print(f"Total Pages in input_pdf.pdf: {len(doc)}")

for pno in range(len(doc)):
    page = doc[pno]
    text = page.get_text("text")
    print(f"\n==================== PAGE {pno + 1} ====================")
    print(text.strip())
