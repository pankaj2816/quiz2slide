import sys
sys.stdout.reconfigure(encoding='utf-8')
import pymupdf
import re

doc = pymupdf.open(r"d:\Work\kaku\test_output\input_pdf.pdf")

def parse_page_perfect(page):
    # Extract blocks and words with precise spatial merging
    words = page.get_text("words")
    # words: (x0, y0, x1, y1, word, block_no, line_no, word_no)
    
    # Filter right edge marks column and page numbers
    valid_words = [w for w in words if w[0] < 560 and not (w[1] > 800 and re.match(r'^\d+$', w[4]))]
    
    # Cluster into visual lines using a smart vertical bounding box overlap
    # Two words belong to the same text line if their vertical extents overlap by > 30%
    # or if vertical distance between centers is < 8px
    lines = []
    for w in sorted(valid_words, key=lambda x: (x[1], x[0])):
        w_top, w_bot = w[1], w[3]
        w_mid = (w_top + w_bot) / 2
        w_h = w_bot - w_top
        
        matched_line = None
        for l in lines:
            l_top, l_bot = l['top'], l['bot']
            l_mid = (l_top + l_bot) / 2
            # Check overlap or proximity
            if abs(w_mid - l_mid) <= 7.5 or (min(w_bot, l_bot) - max(w_top, l_top)) > 0:
                matched_line = l
                break
        
        if matched_line:
            matched_line['words'].append(w)
            matched_line['top'] = min(matched_line['top'], w_top)
            matched_line['bot'] = max(matched_line['bot'], w_bot)
            matched_line['mid'] = (matched_line['top'] + matched_line['bot']) / 2
        else:
            lines.append({
                'top': w_top,
                'bot': w_bot,
                'mid': w_mid,
                'words': [w]
            })
            
    lines.sort(key=lambda l: l['top'])
    
    formatted_lines = []
    for l in lines:
        # Sort words in line by horizontal x0
        l_words = sorted(l['words'], key=lambda w: w[0])
        
        # Check for vertical fraction stacks within the same line (e.g. numerator 'a' at y=626 above denominator 'V2' at y=636)
        # Group words that overlap horizontally (dx overlap)
        merged_tokens = []
        i = 0
        while i < len(l_words):
            w = l_words[i]
            # Check if next word has almost same x-coordinate (fraction stack)
            if i + 1 < len(l_words):
                w_next = l_words[i+1]
                # If horizontal centers are within 8px and one is above the other
                if abs(w[0] - w_next[0]) < 8 and abs(w[1] - w_next[1]) > 3:
                    top_w = w if w[1] < w_next[1] else w_next
                    bot_w = w_next if w[1] < w_next[1] else w
                    frac_str = f"({top_w[4]}/{bot_w[4]})"
                    merged_tokens.append((min(w[0], w_next[0]), frac_str))
                    i += 2
                    continue
            merged_tokens.append((w[0], w[4]))
            i += 1
            
        merged_tokens.sort(key=lambda t: t[0])
        line_text = " ".join(t[1] for t in merged_tokens)
        formatted_lines.append(line_text)
        
    return formatted_lines

print("--- PAGE 1 PERFECT EXTRACTION ---")
p1_lines = parse_page_perfect(doc[0])
for l in p1_lines:
    print(l)
