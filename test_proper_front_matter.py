import sys
sys.stdout.reconfigure(encoding='utf-8')
import pymupdf
import re

doc = pymupdf.open(r'd:\Work\kaku\QUIZ.pdf')
full_text = ""
for p in doc:
    full_text += p.get_text() + "\n"

# Remove front matter: Find the standalone "Section A:" header
m_header = re.search(r'(?:^|\n)\s*(?:Section\s+[A-Z0-9]+:[^\n]+\n+)?\s*(?:Q\.?\s*1|1\.)\s+The majestic', full_text, re.I)
if m_header:
    clean_stream = full_text[m_header.start():]
else:
    # Fallback: remove Instructions block
    clean_stream = re.sub(r'Instructions\s+for\s+students[\s\S]*?Marks\s+are\s+indicated[^\n]*\n+', '', full_text, flags=re.I)

print("Clean stream starts with:")
print(repr(clean_stream[:200]))

questions = []
current_pos = 0

for q_num in range(1, 97):
    pat_curr = re.compile(
        rf'(?:(Section\s+[A-Z0-9]+:\s+[^\n]+)\s*\n+)?(?:^|\n)\s*(?:Q(?:uestion)?\.?\s*{q_num}|\b{q_num})\.\s*',
        re.I
    )
    m_curr = pat_curr.search(clean_stream, current_pos)
    if not m_curr:
        print(f"FAILED to find Q{q_num} starting at pos {current_pos}")
        break
        
    q_start = m_curr.end()
    pat_next = re.compile(
        rf'(?:(Section\s+[A-Z0-9]+:\s+[^\n]+)\s*\n+)?(?:^|\n)\s*(?:Q(?:uestion)?\.?\s*{q_num + 1}|\b{q_num + 1})\.\s*',
        re.I
    )
    m_next = pat_next.search(clean_stream, q_start)
    if m_next:
        q_end = m_next.start()
        current_pos = q_start
    else:
        q_end = len(clean_stream)
        current_pos = len(clean_stream)
        
    raw_block = clean_stream[q_start:q_end].strip()
    
    # Options
    opt_pat = re.compile(r'(?:^|\s)(?:\(\s*([A-Da-d])\s*\)|([A-Da-d])[\.\)])\s+')
    opt_matches = list(opt_pat.finditer(raw_block))
    
    if len(opt_matches) >= 4:
        mA, mB, mC, mD = opt_matches[-4], opt_matches[-3], opt_matches[-2], opt_matches[-1]
        stem = raw_block[:mA.start()].strip()
        optA = raw_block[mA.end():mB.start()].strip()
        optB = raw_block[mB.end():mC.start()].strip()
        optC = raw_block[mC.end():mD.start()].strip()
        optD = raw_block[mD.end():].strip()
    else:
        stem = raw_block
        optA = optB = optC = optD = ""
        
    questions.append({
        'q_num': q_num,
        'stem': stem,
        'options': {'A': optA, 'B': optB, 'C': optC, 'D': optD}
    })

print(f"\nExtracted: {len(questions)} questions")
print("\n--- QUESTION 1 ---")
print("Stem:", repr(questions[0]['stem'][:100]))
print("A:", repr(questions[0]['options']['A'][:50]))

print("\n--- QUESTION 2 ---")
print("Stem:", repr(questions[1]['stem'][:100]))
print("A:", repr(questions[1]['options']['A'][:50]))

print("\n--- QUESTION 3 ---")
print("Stem:", repr(questions[2]['stem'][:100]))
print("A:", repr(questions[2]['options']['A'][:50]))

print("\n--- QUESTION 22 ---")
print("Stem:", repr(questions[21]['stem'][:100]))
print("A:", repr(questions[21]['options']['A'][:50]))
