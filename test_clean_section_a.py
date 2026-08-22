import sys
sys.stdout.reconfigure(encoding='utf-8')
import pymupdf
import re

doc = pymupdf.open(r'd:\Work\kaku\QUIZ.pdf')
full_text = ""
for p in doc:
    full_text += p.get_text() + "\n"

# 1. Strip instructions / front matter before Section A
sec_a_idx = full_text.find("Section A:")
if sec_a_idx != -1:
    clean_stream = full_text[sec_a_idx:]
else:
    clean_stream = full_text

# 2. Extract Questions 1 to 96
questions = []
for q_num in range(1, 97):
    pat_curr = re.compile(
        rf'(?:(Section\s+[A-Z0-9]+:\s+[^\n]+)\s*\n+)?(?:^|\n)\s*(?:Q(?:uestion)?\.?\s*{q_num}|\b{q_num})\.\s*',
        re.I
    )
    m_curr = pat_curr.search(clean_stream)
    if not m_curr:
        print(f"FAILED to find Q{q_num}")
        break
        
    q_start = m_curr.end()
    pat_next = re.compile(
        rf'(?:(Section\s+[A-Z0-9]+:\s+[^\n]+)\s*\n+)?(?:^|\n)\s*(?:Q(?:uestion)?\.?\s*{q_num + 1}|\b{q_num + 1})\.\s*',
        re.I
    )
    m_next = pat_next.search(clean_stream, q_start)
    if m_next:
        raw_block = clean_stream[q_start:m_next.start()].strip()
    else:
        raw_block = clean_stream[q_start:].strip()
        
    # Remove right-edge marks e.g. standalone '1'
    raw_block = re.sub(r'(?<=\n)[1-5]\s*\n', '\n', raw_block)
    
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

print(f"Successfully extracted {len(questions)} questions.")
print("\n--- QUESTION 1 ---")
print("Stem:", questions[0]['stem'])
print("A:", questions[0]['options']['A'])
print("B:", questions[0]['options']['B'])

print("\n--- QUESTION 2 ---")
print("Stem:", questions[1]['stem'])
print("A:", questions[1]['options']['A'])
print("B:", questions[1]['options']['B'])

print("\n--- QUESTION 3 ---")
print("Stem:", questions[2]['stem'])
print("A:", questions[2]['options']['A'])
