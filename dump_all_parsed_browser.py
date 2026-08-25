import sys
sys.stdout.reconfigure(encoding='utf-8')
import os
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

pdf_path = r"d:\Work\kaku\test_output\input_pdf.pdf"
html_path = r"d:\Work\kaku\pdf_quiz_gh_pages\index.html"

chrome_options = Options()
chrome_options.add_argument("--headless=new")
chrome_options.add_argument("--disable-gpu")
chrome_options.add_argument("--allow-file-access-from-files")
chrome_options.add_argument("--disable-web-security")

driver = webdriver.Chrome(options=chrome_options)

try:
    driver.get(f"file:///{html_path}")
    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.ID, "pdfFileInput")))
    file_input = driver.find_element(By.ID, "pdfFileInput")
    file_input.send_keys(pdf_path)
    time.sleep(1)
    driver.find_element(By.ID, "btnParsePdf").click()
    WebDriverWait(driver, 30).until(lambda d: len(d.find_elements(By.CLASS_NAME, "question-item")) > 0)
    
    parsed_qs = driver.execute_script("return state.parsedQuestions;")
    print(f"Total state.parsedQuestions extracted: {len(parsed_qs)}")
    for idx, q in enumerate(parsed_qs, 1):
        print(f"\n==================== SLIDE {idx} [ {q['section'].upper()} Q{q['q_num']} ] ====================")
        print("QUESTION STEM:")
        print(q['question'])
        print("OPTIONS:")
        for k in ['A', 'B', 'C', 'D']:
            if q['options'][k]:
                print(f"  ({k}) {q['options'][k]}")

finally:
    driver.quit()
