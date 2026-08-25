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
    
    # Check Q20's raw chunk
    parsed_qs = driver.execute_script("return state.parsedQuestions;")
    q20 = parsed_qs[19] # index 19 is Q20
    print("Q20 object:", q20)

finally:
    driver.quit()
