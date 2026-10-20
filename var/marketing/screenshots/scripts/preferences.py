"""Opens the Preferences dialog."""
from selenium.webdriver.common.by import By


def run(driver):
    driver.find_element(By.CSS_SELECTOR, "header button[aria-label='Preferences']").click()
