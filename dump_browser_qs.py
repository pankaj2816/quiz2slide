import sys
sys.stdout.reconfigure(encoding='utf-8')
import os
import time
import base64
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import pptx

pdf_path = r"d:\Work\kaku\test_output\input_pdf.pdf"
html_path = r"d:\Work\kaku\pdf_quiz_gh_pages\index.html"
output_pptx = r"d:\Work\kaku\test_output\Quiz_Presentation_30_Slides_Verified.pptx"

chrome_options = Options()
chrome_options.add_argument("--headless=new")
chrome_options.add_argument("--disable-gpu")
chrome_options.add_argument("--window-size=1920,1080")
chrome_options.add_argument("--allow-file-access-from-files")
chrome_options.add_argument("--disable-web-security")

driver = webdriver.Chrome(options=chrome_options)

try:
    print(f"Loading local web app: file:///{html_path}")
    driver.get(f"file:///{html_path}")

    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.ID, "pdfFileInput")))
    rev_badge = driver.find_element(By.CLASS_NAME, "revision-badge").text
    print(f"Loaded Page. Revision badge: {rev_badge}")

    print(f"Uploading PDF: {pdf_path}")
    file_input = driver.find_element(By.ID, "pdfFileInput")
    file_input.send_keys(pdf_path)

    time.sleep(1)
    parse_btn = driver.find_element(By.ID, "btnParsePdf")
    parse_btn.click()
    print("Clicked 'Parse PDF Questions'. Waiting for parsing to complete...")

    WebDriverWait(driver, 30).until(lambda d: len(d.find_elements(By.CLASS_NAME, "question-item")) > 0)
    
    # Extract questions array directly from JS state
    parsed_qs = driver.execute_script("return state.parsedQuestions;")
    print(f"Total state.parsedQuestions extracted: {len(parsed_qs)}")
    for idx, q in enumerate(parsed_qs, 1):
        print(f"Q{idx:>2} (q_num={q['q_num']}): {q['question'][:60].replace(chr(10), ' ')} | Options: {list(q['options'].keys())}")

finally:
    driver.quit()
