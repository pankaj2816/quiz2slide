import pymupdf

doc = pymupdf.open(r"d:\Work\kaku\test_output\input_pdf.pdf")
print("=== PAGE 1 ===")
print(doc[0].get_text())

print("=== PAGE 2 ===")
print(doc[1].get_text())

print("=== PAGE 3 ===")
print(doc[2].get_text())
