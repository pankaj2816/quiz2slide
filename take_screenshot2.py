import sys
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

chrome_options = Options()
chrome_options.add_argument("--headless=new")
chrome_options.add_argument("--window-size=1400,1200")
chrome_options.add_argument("--allow-file-access-from-files")

driver = webdriver.Chrome(options=chrome_options)
try:
    driver.get("file:///d:/Work/kaku/pdf_quiz_gh_pages/index.html")
    time.sleep(1)
    driver.execute_script("window.scrollTo(0, 450);")
    time.sleep(0.5)
    driver.save_screenshot(r"C:\Users\Lenovo\.gemini\antigravity\brain\8ad26341-31c8-489f-8b94-35a6e7a0c5aa\step2_alignment_fixed.png")
    print("Step 2 Screenshot saved!")
finally:
    driver.quit()
