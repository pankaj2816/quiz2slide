import sys
import os
import json
import pymupdf

# Test simulation of client-side extraction on QUIZ.pdf
doc = pymupdf.open(r'd:\Work\kaku\QUIZ.pdf')
print(f"Total pages: {len(doc)}")

# Replicate PDF.js text item extraction
all_text_items = []
for pno in range(len(doc)):
    page = doc[pno]
    rect = page.rect
    blocks = page.get_text("dict")["blocks"]
    page_items = []
    for b in blocks:
        if b.get("type") == 0:
            for l in b["lines"]:
                for s in l["spans"]:
                    text = s["text"]
                    if not text.strip():
                        continue
                    x0, y0, x1, y1 = s["bbox"]
                    # Filter
                    if x0 > 565 and text.strip() in ['1', '2', '3', '4', '5']:
                        continue
                    if y0 < 35 and any(h in text.lower() for h in ['cbse', 'quiz']):
                        continue
                    if y0 > (rect.height - 45) and 'page' in text.lower():
                        continue
                    page_items.append({
                        'str': text,
                        'x': x0,
                        'y': y0,
                        'size': s['size']
                    })
                    
    # Sort
    page_items.sort(key=lambda it: (it['y'], it['x']))
    
    # Cluster lines
    lines = []
    for it in page_items:
        matched = None
        for l in lines:
            if abs(l['y'] - it['y']) < 4.5:
                matched = l
                break
        if matched:
            matched['items'].append(it)
        else:
            lines.append({'y': it['y'], 'items': [it]})
            
    for l in lines:
        l['items'].sort(key=lambda i: i['x'])
        line_str = " ".join(i['str'] for i in l['items']).strip()
        if line_str:
            all_text_items.append(line_str)

full_stream = "\n".join(all_text_items)
print(f"Total extracted lines: {len(all_text_items)}")
print(f"Full stream length: {len(full_stream)} characters")

# Check questions
import re
q_matches = list(re.finditer(r'(?:^|\n)\s*(?:Q(?:uestion)?\.?\s*(\d+)|\b(\d+))\.\s*', full_stream))
print(f"Detected {len(q_matches)} question anchors in stream")
