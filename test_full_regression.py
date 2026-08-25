import sys
sys.stdout.reconfigure(encoding='utf-8')
import pymupdf
import re

doc = pymupdf.open(r"d:\Work\kaku\test_output\input_pdf.pdf")

def run_regression():
    all_pages_lines = []
    
    for pno in range(len(doc)):
        page = doc[pno]
        words = page.get_text("words")
        words = [w for w in words if w[0] < 560 and not (w[1] > 800 and re.match(r'^\d+$', w[4]))]
        words.sort(key=lambda w: (w[1], w[0]))
        
        lines = []
        for w in words:
            w_y = w[1]
            matched = None
            for l in lines:
                if abs(w_y - l['base_y']) <= 6.0:
                    matched = l
                    break
            if matched:
                matched['words'].append(w)
                matched['base_y'] = sum(x[1] for x in matched['words']) / len(matched['words'])
            else:
                lines.append({'base_y': w_y, 'words': [w]})
                
        lines.sort(key=lambda l: l['base_y'])
        
        page_lines = []
        for l in lines:
            l_words = sorted(l['words'], key=lambda w: w[0])
            merged = []
            i = 0
            while i < len(l_words):
                w = l_words[i]
                if i + 1 < len(l_words):
                    w_next = l_words[i+1]
                    # Never merge keywords
                    is_keyword = any(w[4].startswith(k) or w_next[4].startswith(k) for k in ['Option', 'Q.', 'Correct', 'Solution', 'Hence'])
                    if not is_keyword and abs(w[0] - w_next[0]) <= 8.0 and abs(w[1] - w_next[1]) >= 3.5:
                        top_w = w if w[1] < w_next[1] else w_next
                        bot_w = w_next if w[1] < w_next[1] else w
                        frac_text = f"{top_w[4]}/{bot_w[4]}"
                        merged.append((min(w[0], w_next[0]), frac_text))
                        i += 2
                        continue
                merged.append((w[0], w[4]))
                i += 1
                
            merged.sort(key=lambda t: t[0])
            line_str = " ".join(t[1] for t in merged)
            
            line_str = re.sub(r'\(P\s*\+\s*a/V2\)', r'(P + a/V²)', line_str)
            line_str = re.sub(r'ab[−\-]2\b', r'ab⁻²', line_str)
            
            page_lines.append(line_str)
            
        all_pages_lines.extend(page_lines)
        
    full_text = "\n".join(all_pages_lines)
    
    # Parse questions
    q_matches = list(re.finditer(r'(?:^|\n)\s*Q(?:uestion)?\.?\s*(\d+)\s*\n*', full_text, re.IGNORECASE))
    print(f"Total Q matches: {len(q_matches)}")
    
    questions = []
    for i, m in enumerate(q_matches):
        q_num = m.group(1)
        start = m.end()
        end = q_matches[i+1].start() if i+1 < len(q_matches) else len(full_text)
        chunk = full_text[start:end].strip()
        
        # If chunk is too short or doesn't have words, skip
        if len(chunk) < 10:
            continue
            
        sol_m = re.search(r'\n\s*(?:Correct\s+Answer:|Solution:|Ans(?:wer)?:)', chunk, re.IGNORECASE)
        qa_chunk = chunk[:sol_m.start()].strip() if sol_m else chunk
        
        opt_matches = list(re.finditer(r'(?:^|\n)\s*Option\s*([1-4A-D])\s*:\s*', qa_chunk, re.IGNORECASE))
        stem = qa_chunk[:opt_matches[0].start()].strip() if opt_matches else qa_chunk
        
        opts = []
        if opt_matches:
            for oi, om in enumerate(opt_matches):
                o_start = om.end()
                o_end = opt_matches[oi+1].start() if oi+1 < len(opt_matches) else len(qa_chunk)
                opts.append(qa_chunk[o_start:o_end].strip().replace('\n', ' '))
                
        questions.append((q_num, stem, opts))
        print(f"Q{q_num:>2}: {stem[:70]}... | Options: {len(opts)}")
        
    print(f"\nFinal Extracted Questions count: {len(questions)}")

run_regression()
