import sys
sys.stdout.reconfigure(encoding='utf-8')
import pymupdf

doc = pymupdf.open(r"d:\Work\kaku\test_output\input_pdf.pdf")
p3 = doc[2] # Page 3 (Question 4)

words = p3.get_text("words")
items = [{'str': w[4], 'x': w[0], 'y': w[1]} for w in words]
items.sort(key=lambda it: (it['y'], it['x']))

lines = []
for it in items:
    matched = None
    for l in lines:
        if abs(it['y'] - l['base_y']) <= 4.0:
            matched = l
            break
    if matched:
        matched['items'].append(it)
        matched['base_y'] = sum(x['y'] for x in matched['items']) / len(matched['items'])
    else:
        lines.append({'base_y': it['y'], 'items': [it]})

lines.sort(key=lambda l: l['base_y'])

print("=== PAGE 3 LINES ===")
for idx, l in enumerate(lines, 1):
    l['items'].sort(key=lambda it: it['x'])
    line_str = " ".join(it['str'] for it in l['items'])
    print(f"L{idx:>2} (y={l['base_y']:5.1f}): {line_str}")
