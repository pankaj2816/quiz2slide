import sys
sys.stdout.reconfigure(encoding='utf-8')
import pymupdf

doc = pymupdf.open(r'd:\Work\kaku\QUIZ.pdf')
p5 = doc[4] # Page 5 (0-indexed 4)
text_p5 = p5.get_text()
print("Page 5 Text:")
print(text_p5[:300])
print("'Region X' in text:", 'Region X' in text_p5)
print("'diagram below' in text:", 'diagram below' in text_p5)

# Check images on Page 5
img_list = p5.get_images()
print("Images on Page 5:", len(img_list))
for img in img_list:
    xref = img[0]
    base_img = doc.extract_image(xref)
    print(f"  xref {xref}: {base_img['width']}x{base_img['height']} {base_img['ext']}")
