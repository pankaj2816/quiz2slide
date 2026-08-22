import sys
sys.stdout.reconfigure(encoding='utf-8')
import pymupdf
import os

doc = pymupdf.open(r'd:\Work\kaku\QUIZ.pdf')
p5 = doc[4]
rect = p5.rect
print("Page 5 dimensions:", rect.width, rect.height)

# Q22 starts around y = 180, diagram is y = 210 to 420
# Options start around y = 430
clip_rect = pymupdf.Rect(rect.width * 0.08, rect.height * 0.25, rect.width * 0.92, rect.height * 0.50)
pix = p5.get_pixmap(clip=clip_rect, dpi=200)
os.makedirs('output', exist_ok=True)
pix.save('output/test_q22_crop.png')
print("Saved output/test_q22_crop.png")
