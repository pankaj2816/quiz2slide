import pymupdf

pdf_path = r"C:\Users\Lenovo\.gemini\antigravity\brain\8ad26341-31c8-489f-8b94-35a6e7a0c5aa\.user_uploaded\media_1787675766400.pdf"
doc = pymupdf.open(pdf_path)
print(f"File: {pdf_path}")
print(f"Total pages: {len(doc)}")
print(f"Page 1 Text: {doc[0].get_text()[:150]}")
