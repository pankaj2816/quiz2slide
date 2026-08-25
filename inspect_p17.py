import sys
sys.stdout.reconfigure(encoding='utf-8')
import pymupdf

doc = pymupdf.open(r"d:\Work\kaku\test_output\input_pdf.pdf")
page17 = doc[16] # Page 17

print("=== PAGE 17 WORDS ===")
words = page17.get_text("words")
for w in words:
    print(f"y={w[1]:.1f}, x={w[0]:.1f}: '{w[4]}'")
