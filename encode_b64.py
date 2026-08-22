import base64

with open(r'd:\Work\kaku\pdf_quiz_gh_pages\chalkboard_bg.png', 'rb') as f:
    b64 = base64.b64encode(f.read()).decode('utf-8')

print('Base64 length:', len(b64))
with open(r'd:\Work\kaku\pdf_quiz_gh_pages\chalkboard_b64.js', 'w', encoding='utf-8') as f:
    f.write('const DEFAULT_CHALKBOARD_BASE64 = "data:image/png;base64,' + b64 + '";\n')

print('Wrote chalkboard_b64.js successfully!')
