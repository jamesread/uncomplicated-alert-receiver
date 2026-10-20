"""Clicks the team=infra label to show the filter bar narrowing the board."""
from selenium.webdriver.common.by import By


def run(driver):
    driver.find_element(By.CSS_SELECTOR, "#alert-list button[title^='team=infra ']").click()
