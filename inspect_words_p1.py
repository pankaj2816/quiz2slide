import sys
sys.stdout.reconfigure(encoding='utf-8')
import pymupdf

doc = pymupdf.open(r"d:\Work\kaku\test_output\input_pdf.pdf")
page1 = doc[0]

words = page1.get_text("words")
print(f"Page 1 total words: {len(words)}")
# Sort by y0, then x0
words.sort(key=lambda w: (round(w[1], 1), w[0]))

for w in words:
    # (x0, y0, x1, y1, word, block_no, line_no, word_no)
    print(f"y={w[1]:.1f}, x={w[0]:.1f}-{w[2]:.1f}: '{w[4]}'")
