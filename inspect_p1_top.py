import sys
sys.stdout.reconfigure(encoding='utf-8')
import pymupdf

doc = pymupdf.open(r"d:\Work\kaku\test_output\input_pdf.pdf")
p1 = doc[0]

words = p1.get_text("words")
words.sort(key=lambda w: (w[1], w[0]))

print("=== WORDS ON PAGE 1 (Y < 180) ===")
for w in words:
    if w[1] < 180:
        print(f"y={w[1]:6.2f}, x={w[0]:6.2f}, text='{w[4]}'")
