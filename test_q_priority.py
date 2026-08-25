import sys
sys.stdout.reconfigure(encoding='utf-8')
import re
from test_universal_parser import ocr_all

def parse_with_q_priority(text):
    has_explicit_q = bool(re.search(r'\bQ(?:uestion)?\.?\s*\d+', text, re.I))
    print(f"Has explicit 'Q.' in document: {has_explicit_q}")
    
    if has_explicit_q:
        q_pat = re.compile(
            r'(?:(?:^|\n)(?:Section\s+[A-Z0-9]+:?|Physics|Chemistry|Mathematics|Social\s+Science)\s*\n+)?'
            r'(?:^|\n)\s*(?:Q(?:uestion)?\.?\s*(\d+))\s*[\.\:\-\s]',
            re.I
        )
    else:
        q_pat = re.compile(
            r'(?:(?:^|\n)(?:Section\s+[A-Z0-9]+:?|Physics|Chemistry|Mathematics|Social\s+Science)\s*\n+)?'
            r'(?:^|\n)\s*(?:Q(?:uestion)?\.?\s*(\d+)|\b(\d+)\.)\s+',
            re.I
        )
        
    matches = list(q_pat.finditer(text))
    print(f"Total questions found: {len(matches)}")
    
    parsed = []
    current_section = "Physics"
    
    for i, m in enumerate(matches):
        q_num = m.group(1) if m.group(1) is not None else m.group(2)
        
        pre_chunk = text[max(0, m.start() - 100):m.start()]
        sec_m = re.search(r'\b(Physics|Chemistry|Mathematics|Section\s+[A-Z0-9]+:?[^\n]*)\b', pre_chunk, re.I)
        if sec_m:
            current_section = sec_m.group(1).strip()
            
        start_idx = m.end()
        end_idx = matches[i+1].start() if i + 1 < len(matches) else len(text)
        raw_chunk = text[start_idx:end_idx].strip()
        
        # Isolate question+options from Solution & Correct Answer
        sol_match = re.search(r'\n\s*(?:Correct\s+Answer:|Solution:|Ans(?:wer)?:)', raw_chunk, re.I)
        if sol_match:
            qa_chunk = raw_chunk[:sol_match.start()].strip()
            sol_chunk = raw_chunk[sol_match.start():].strip()
        else:
            qa_chunk = raw_chunk
            sol_chunk = ""
            
        # Parse Options: "Option 1:" ... "Option 4:" OR "(A)" ... "(D)" OR "(1)" ... "(4)"
        opt_matches = list(re.finditer(r'(?:^|\n)\s*(?:Option\s*([1-4A-Da-d])\s*:|\(\s*([A-Da-d1-4])\s*\)|([A-Da-d])[\.\)])\s+', qa_chunk, re.I))
        
        if len(opt_matches) >= 4:
            mA, mB, mC, mD = opt_matches[-4], opt_matches[-3], opt_matches[-2], opt_matches[-1]
            stem = qa_chunk[:mA.start()].strip()
            optA = qa_chunk[mA.end():mB.start()].strip()
            optB = qa_chunk[mB.end():mC.start()].strip()
            optC = qa_chunk[mC.end():mD.start()].strip()
            optD = qa_chunk[mD.end():].strip()
        else:
            stem = qa_chunk
            optA = optB = optC = optD = ""
            
        parsed.append({
            'q_num': int(q_num),
            'section': current_section,
            'stem': stem,
            'options': {'A': optA, 'B': optB, 'C': optC, 'D': optD},
            'solution': sol_chunk
        })
        
    return parsed

results = parse_with_q_priority(ocr_all)
print(f"\nFinal count of clean questions: {len(results)}")
for r in results:
    print(f"[{r['section']}] Q{r['q_num']}: {r['stem'][:70]}... | (A): {r['options']['A'][:25]}")
