import sys
sys.stdout.reconfigure(encoding='utf-8')
import pymupdf

doc = pymupdf.open(r'd:\Work\kaku\QUIZ.pdf')
p5 = doc[4]
clip_rect = pymupdf.Rect(135, 505, 482, 662)
pix = p5.get_pixmap(clip=clip_rect, dpi=200)
pix.save('output/clean_q22_diagram.png')
print("Saved clean diagram")
