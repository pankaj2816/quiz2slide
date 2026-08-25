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
    
    matches_info = driver.execute_script("""
        const qPat = /(?:^|\\n)\\s*(?:(?:Section\\s+[A-Z0-9]+:?|Physics|Chemistry|Mathematics|Biology|Social\\s+Science)\\s*\\n+)?\\s*Q(?:uestion)?\\.?\\s*(\\d+)\\b/gi;
        const matches = [];
        let m;
        while ((m = qPat.exec(window._lastFullStream || '')) !== null) {
            matches.push({ full: m[0], num: m[1], index: m.index, snippet: (window._lastFullStream || '').slice(m.index, m.index + 80) });
        }
        return matches;
    """)
    for idx, m in enumerate(matches_info, 1):
        print(f"{idx:>2}. num={m['num']:>2}, full='{m['full'].strip()}' | snippet: '{m['snippet'].replace(chr(10), ' ')}'")

finally:
    driver.quit()
