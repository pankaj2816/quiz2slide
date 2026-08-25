import sys
sys.stdout.reconfigure(encoding='utf-8')
import pymupdf
import os

# Let's inspect Page 3 (Question 4 lens diagram)
# In Careers360 PDF, Page 3 is where Q4 is located
# Let's see all images and vector drawings on Page 3
doc = pymupdf.open(r'd:\Work\kaku\pdf_quiz_tool\test_math_quiz.pdf') # Let's check available pdfs
print("Checking available pdfs in workspace...")
for root, dirs, files in os.walk(r'd:\Work\kaku'):
    for f in files:
        if f.endswith('.pdf'):
            print("Found PDF:", os.path.join(root, f))
