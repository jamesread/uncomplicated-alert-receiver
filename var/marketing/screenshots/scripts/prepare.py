"""Waits for the board to fetch and render the seeded alerts before capture."""
import time

from selenium.webdriver.common.by import By


def run(driver):
    deadline = time.time() + 15
    while time.time() < deadline:
        if driver.find_elements(By.CSS_SELECTOR, "#alert-list .alert .annotation"):
            break
        time.sleep(0.25)
    driver.execute_script("window.scrollTo(0, 0);")
