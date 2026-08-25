import sys
sys.stdout.reconfigure(encoding='utf-8')
import pymupdf
import re

# Let's inspect Page 1 (Q1 options) in the PDF to see the exact bounding boxes of the fractions
# cos^-1 ( 1 / sqrt(3) )
print("Testing fraction reconstruction on math options...")

def format_clean_option(raw_opt):
    # Fix broken fraction lines where numerator is separated from denominator
    # E.g. "cos−1 (\n1\n√3\n)" -> "cos⁻¹(1/√3)"
    s = raw_opt
    s = re.sub(r'cos[−\-]1\s*\(\s*(\d+)\s+([^\)]+)\s*\)', r'cos⁻¹(\1 / \2)', s)
    s = re.sub(r'cos[−\-]1\s*\(\s*√\s*(\d+)\s+([^\)]+)\s*\)', r'cos⁻¹(√\1 / \2)', s)
    s = re.sub(r'sin[−\-]1\s*\(\s*([^\)]+)\s*\)', r'sin⁻¹(\1)', s)
    s = re.sub(r'tan[−\-]1\s*\(\s*([^\)]+)\s*\)', r'tan⁻¹(\1)', s)
    
    # Fix fraction vertical stacks:
    # "σq\n4ϵ0" -> "σq / 4ϵ0"
    # "3σq\n2ϵ0" -> "3σq / 2ϵ0"
    # "− α\n2" -> "−α / 2"
    # "μ\nμ0" -> "μ / μ0"
    # "μr\nμ0" -> "μr / μ0"
    
    # Replace newlines inside options with spaces or '/'
    lines = [l.strip() for l in s.split('\n') if l.strip()]
    if len(lines) == 2:
        # Check if line 1 is numerator and line 2 is denominator
        if len(lines[0]) <= 8 and len(lines[1]) <= 8:
            s = f"{lines[0]} / {lines[1]}"
        else:
            s = " ".join(lines)
    else:
        s = " ".join(lines)
        
    # Standardize powers: x^2 -> x², 10^-3 -> 10⁻³, etc.
    s = re.sub(r'(?<=[a-zA-Z\d\)])\^([-\d]+)', lambda m: m.group(1).replace('-', '⁻').replace('0','⁰').replace('1','¹').replace('2','²').replace('3','³').replace('4','⁴').replace('5','⁵').replace('6','⁶').replace('7','⁷').replace('8','⁸').replace('9','⁹'), s)
    return s

print("Option 1 test:")
print(format_clean_option("cos−1 (\n1\n√3\n)"))
print("Option 2 test:")
print(format_clean_option("cos−1 (\n2\n3\n)"))
print("Option 4 test:")
print(format_clean_option("cos−1 (√ 2\n3 )"))
print("Fraction test 1:")
print(format_clean_option("3σq\n2ϵ0"))
print("Fraction test 2:")
print(format_clean_option("− α\n2"))
