import pymupdf

for p in [r'd:\Work\kaku\pdf_quiz_tool\uploads\quiz_550ab9a8.pdf', 
          r'd:\Work\kaku\pdf_quiz_tool\uploads\quiz_678259a9.pdf', 
          r'd:\Work\kaku\pdf_quiz_tool\uploads\quiz_81b4b30e.pdf']:
    try:
        doc = pymupdf.open(p)
        print(f"{p} has {len(doc)} pages. First page: {doc[0].get_text()[:60]}")
    except Exception as e:
        print(f"Error reading {p}: {e}")
