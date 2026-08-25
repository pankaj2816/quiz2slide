import sys
sys.stdout.reconfigure(encoding='utf-8')
import pymupdf

doc = pymupdf.open(r"d:\Work\kaku\test_output\input_pdf.pdf")

full_lines = []

for pno in range(len(doc)):
    page = doc[pno]
    words = page.get_text("words")
    items = [{'str': w[4], 'x': w[0], 'y': w[1]} for w in words]
    # Filter header/footer
    items = [it for it in items if not (it['y'] < 35 or it['y'] > 800)]
    items.sort(key=lambda it: (it['y'], it['x']))

    lines = []
    for it in items:
        matched = None
        for l in lines:
            if abs(it['y'] - l['base_y']) <= 3.8:
                matched = l
                break
        if matched:
            matched['items'].append(it)
            matched['base_y'] = sum(x['y'] for x in matched['items']) / len(matched['items'])
        else:
            lines.append({'base_y': it['y'], 'items': [it]})

    lines.sort(key=lambda l: l['base_y'])

    for l in lines:
        l['items'].sort(key=lambda it: it['x'])
        line_str = " ".join(it['str'] for it in l['items'])
        full_lines.append(line_str)

print(f"Extracted {len(full_lines)} total lines from {len(doc)} pages.")
with open(r"d:\Work\kaku\pdf_quiz_gh_pages\simulated_lines.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(full_lines))
print("Saved to simulated_lines.txt")
