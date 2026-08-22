import sys
sys.stdout.reconfigure(encoding='utf-8')
import pymupdf

doc = pymupdf.open(r'd:\Work\kaku\QUIZ.pdf')
p5 = doc[4]
rect = p5.rect

# Crop exact diagram bounding box on Page 5
# Rect(140.25, 482.99, 477.74, 662.99)
clip_rect = pymupdf.Rect(135, 475, 485, 670)
pix = p5.get_pixmap(clip=clip_rect, dpi=200)
pix.save('output/perfect_q22_diagram.png')
print("Saved output/perfect_q22_diagram.png successfully!")
