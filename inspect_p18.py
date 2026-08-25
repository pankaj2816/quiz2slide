import sys
sys.stdout.reconfigure(encoding='utf-8')
import pymupdf

doc = pymupdf.open(r"d:\Work\kaku\test_output\input_pdf.pdf")
page18 = doc[17] # 0-indexed Page 18

print("=== PAGE 18 TEXT ===")
print(page18.get_text())

print("\n=== PAGE 18 WORDS ===")
words = page18.get_text("words")
for w in words:
    print(f"y={w[1]:.1f}, x={w[0]:.1f}: '{w[4]}'")
