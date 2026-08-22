import sys
sys.stdout.reconfigure(encoding='utf-8')
import pymupdf

doc = pymupdf.open(r'd:\Work\kaku\QUIZ.pdf')
p5 = doc[4]
print("Page 5 rect:", p5.rect)

for img in p5.get_images():
    xref = img[0]
    rects = p5.get_image_rects(xref)
    base_img = doc.extract_image(xref)
    print(f"xref {xref} ({base_img['width']}x{base_img['height']}): rects = {rects}")
