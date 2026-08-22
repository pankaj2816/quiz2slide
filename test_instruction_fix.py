import sys
sys.stdout.reconfigure(encoding='utf-8')
import re
import pymupdf

doc = pymupdf.open(r'd:\Work\kaku\QUIZ.pdf')
all_lines = []

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
                    if x0 > 565 and text.strip() in ['1', '2', '3', '4', '5', '0.5']:
                        continue
                    if y0 < 35 and any(h in text.lower() for h in ['cbse', 'quiz']):
                        continue
                    if y0 > (rect.height - 45) and 'page' in text.lower():
                        continue
                    page_items.append({'str': text, 'x': x0, 'y': y0})
                    
    page_items.sort(key=lambda it: (it['y'], it['x']))
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
            
    page_lines = []
    for l in lines:
        l['items'].sort(key=lambda i: i['x'])
        line_str = " ".join(i['str'] for i in l['items']).strip()
        if line_str and not any(h in line_str.lower() for h in ['7th cbse', 'page ', 'maximum marks', 'subject:']):
            page_lines.append(line_str)
            
    if pno == 0:
        clean_p1 = []
        past_instructions = False
        for l in page_lines:
            if 'Section A:' in l or re.match(r'^(?:Q\.?\s*1|1\.)\s+The majestic', l, re.I):
                past_instructions = True
            if not past_instructions:
                if any(h in l for h in ['Total Questions', 'Time Allowed', 'Maximum Marks', 'General Instructions:']):
                    continue
                if re.match(r'^[1-4]\.\s+(This paper|The Test|All questions|Marks are|Each question)', l, re.I):
                    continue
            clean_p1.append(l)
        all_lines.extend(clean_p1)
    else:
        all_lines.extend(page_lines)

full_stream = "\n".join(all_lines)

# Sequential Question Extraction
questions = []
q_num = 1
current_pos = 0
current_section = ""

def clean_text(s):
    return re.sub(r'\s+', ' ', s.replace('|', ' ')).replace(' ∘C', '°C').replace('∘C', '°C').strip()

while q_num <= 96:
    pat_curr = re.compile(
        rf'(?:(Section\s+[A-Z0-9]+:\s+[^\n]+)\s*\n+)?(?:^|\n)\s*(?:Q(?:uestion)?\.?\s*{q_num}|\b{q_num})\.\s*',
        re.I
    )
    m_curr = pat_curr.search(full_stream, current_pos)
    if not m_curr:
        print(f"FAILED to find Q{q_num} starting after pos {current_pos}")
        break
        
    if m_curr.group(1):
        current_section = clean_text(m_curr.group(1))
        
    q_start = m_curr.end()
    pat_next = re.compile(
        rf'(?:(Section\s+[A-Z0-9]+:\s+[^\n]+)\s*\n+)?(?:^|\n)\s*(?:Q(?:uestion)?\.?\s*{q_num + 1}|\b{q_num + 1})\.\s*',
        re.I
    )
    m_next = pat_next.search(full_stream, q_start)
    if m_next:
        q_end = m_next.start()
        current_pos = q_start
    else:
        q_end = len(full_stream)
        current_pos = len(full_stream)
        
    raw_block = full_stream[q_start:q_end].strip()
    
    # Options
    opt_pat = re.compile(r'(?:^|\s)(?:\(\s*([A-Da-d])\s*\)|([A-Da-d])[\.\)])\s+')
    opt_matches = list(opt_pat.finditer(raw_block))
    
    if len(opt_matches) >= 4:
        mA, mB, mC, mD = opt_matches[-4], opt_matches[-3], opt_matches[-2], opt_matches[-1]
        stem = raw_block[:mA.start()].strip()
        optA = clean_text(raw_block[mA.end():mB.start()])
        optB = clean_text(raw_block[mB.end():mC.start()])
        optC = clean_text(raw_block[mC.end():mD.start()])
        optD = clean_text(raw_block[mD.end():])
    else:
        stem = raw_block
        optA = optB = optC = optD = ""
        
    stem_lines = [clean_text(l) for l in stem.split('\n') if clean_text(l)]
    questions.append({
        'q_num': q_num,
        'section': current_section,
        'question': "\n".join(stem_lines),
        'options': {'A': optA, 'B': optB, 'C': optC, 'D': optD}
    })
    q_num += 1

print(f"Extracted: {len(questions)} questions")
print("Q1 Stem:", questions[0]['question'][:80])
print("Q2 Stem:", questions[1]['question'][:80])
print("Q22 Stem:", questions[21]['question'][:80])
print("Q96 Stem:", questions[95]['question'][:80])
