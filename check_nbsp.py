import sys
sys.stdout.reconfigure(encoding='utf-8')
import pymupdf
import re

doc = pymupdf.open(r'd:\Work\kaku\QUIZ.pdf')
p5 = doc[4]
text = p5.get_text()

print("Checking 'Region X':", 'Region X' in text)
print("Checking with regex r'Region\\s+X':", bool(re.search(r'Region\s+X', text)))
print("Checking with regex r'diagram\\s+below':", bool(re.search(r'diagram\s+below', text, re.I)))

for b in p5.get_text("dict")["blocks"]:
    if b.get("type") == 0:
        for l in b["lines"]:
            for s in l["spans"]:
                if 'Region' in s['text'] or 'diagram' in s['text']:
                    print(f"Span: {s['text']!r}")
