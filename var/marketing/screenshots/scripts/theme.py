"""Pins the picocrank theme; the browser session is shared across captures."""
import time


def set_theme(driver, theme):
    current = driver.execute_script("return localStorage.getItem('picocrank-theme');")
    if current == theme:
        return
    driver.execute_script("localStorage.setItem('picocrank-theme', arguments[0]); location.reload();", theme)
    time.sleep(3)
