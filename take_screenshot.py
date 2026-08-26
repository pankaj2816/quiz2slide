import sys
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

chrome_options = Options()
chrome_options.add_argument("--headless=new")
chrome_options.add_argument("--window-size=1400,900")
chrome_options.add_argument("--allow-file-access-from-files")

driver = webdriver.Chrome(options=chrome_options)
try:
    driver.get("file:///d:/Work/kaku/pdf_quiz_gh_pages/index.html")
    time.sleep(1)
    driver.save_screenshot(r"C:\Users\Lenovo\.gemini\antigravity\brain\8ad26341-31c8-489f-8b94-35a6e7a0c5aa\alignment_fixed.png")
    print("Screenshot saved to alignment_fixed.png")
finally:
    driver.quit()
