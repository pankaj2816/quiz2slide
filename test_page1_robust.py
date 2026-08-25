import sys
sys.stdout.reconfigure(encoding='utf-8')
import pymupdf
import re

SUPERSCRIPT_MAP = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', 'n': 'ⁿ', 'i': 'ⁱ', 'x': 'ˣ', 'y': 'ʸ'
}
SUBSCRIPT_MAP = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  'r': 'ᵣ', 't': 'ₜ', 'L': 'ₗ', '0': '₀'
}

def to_sup(s):
    return "".join(SUPERSCRIPT_MAP.get(c, c) for c in str(s))
def to_sub(s):
    return "".join(SUBSCRIPT_MAP.get(c, c) for c in str(s))

def extract_lines_robust(page):
    words = page.get_text("words")
    # Filter right edge marks column and page number
    words = [w for w in words if w[0] < 560 and not (w[1] > 800 and re.match(r'^\d+$', w[4]))]
    
    # Sort words by vertical coordinate y0, then horizontal x0
    words.sort(key=lambda w: (w[1], w[0]))
    
    # Cluster into lines using baseline tolerance = 6.0px
    lines = []
    for w in words:
        w_y = w[1]
        matched_line = None
        for l in lines:
            if abs(w_y - l['base_y']) <= 6.0:
                matched_line = l
                break
        if matched_line:
            matched_line['words'].append(w)
            # Update running average baseline
            matched_line['base_y'] = sum(x[1] for x in matched_line['words']) / len(matched_line['words'])
        else:
            lines.append({
                'base_y': w_y,
                'words': [w]
            })
            
    lines.sort(key=lambda l: l['base_y'])
    
    extracted_lines = []
    for l in lines:
        l_words = sorted(l['words'], key=lambda w: w[0])
        
        # Merge fraction stacks in line (words overlapping horizontally within 6px)
        merged_tokens = []
        i = 0
        while i < len(l_words):
            w = l_words[i]
            if i + 1 < len(l_words):
                w_next = l_words[i+1]
                if abs(w[0] - w_next[0]) <= 8.0 and abs(w[1] - w_next[1]) >= 3.5:
                    top_w = w if w[1] < w_next[1] else w_next
                    bot_w = w_next if w[1] < w_next[1] else w
                    frac_text = f"({top_w[4]}/{bot_w[4]})"
                    merged_tokens.append((min(w[0], w_next[0]), frac_text))
                    i += 2
                    continue
            merged_tokens.append((w[0], w[4]))
            i += 1
            
        merged_tokens.sort(key=lambda t: t[0])
        
        # Build line text
        line_str = ""
        for t in merged_tokens:
            w_str = t[1]
            # Fix V2 in fraction: (a/V2) -> (a/V²)
            w_str = re.sub(r'\((\w+)/V2\)', r'(\1/V²)', w_str)
            # Fix ab-2 -> ab⁻²
            w_str = re.sub(r'ab[−\-]2', r'ab⁻²', w_str)
            
            if not line_str:
                line_str = w_str
            elif w_str in [',', '.', ':', ';', '?', '!', '%']:
                line_str += w_str
            elif line_str.endswith('(') or w_str.startswith(')'):
                line_str += w_str
            else:
                line_str += " " + w_str
                
        # Clean math notations
        line_str = re.sub(r'\(P\s*\+\s*\(a/V²\)\)', r'(P + a/V²)', line_str)
        line_str = re.sub(r'\(V\s*[−\-]\s*b\)', r'(V − b)', line_str)
        extracted_lines.append(line_str)
        
    return extracted_lines

doc = pymupdf.open(r"d:\Work\kaku\test_output\input_pdf.pdf")
print("=== PAGE 1 EXTRACTION ===")
for l in extract_lines_robust(doc[0]):
    print(l)
