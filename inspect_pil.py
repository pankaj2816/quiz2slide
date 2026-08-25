import os
from PIL import Image

folder = r'd:\Work\kaku\pdf_quiz_gh_pages\extracted_slide_images'
for f in sorted(os.listdir(folder)):
    if f.endswith('.png'):
        p = os.path.join(folder, f)
        img = Image.open(p)
        # Check if mostly blank/white or has content
        colors = img.getcolors(maxcolors=256)
        print(f"{f}: dimensions={img.size}, mode={img.mode}")
