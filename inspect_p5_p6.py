import sys
sys.stdout.reconfigure(encoding='utf-8')
import pymupdf

doc = pymupdf.open(r'd:\Work\kaku\QUIZ.pdf')
print("--- PAGE 5 ---")
print(doc[4].get_text())

print("--- PAGE 6 ---")
print(doc[5].get_text())
