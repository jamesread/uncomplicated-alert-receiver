update-screenshots:
	python3 -c "from selenium.webdriver.chrome.service import Service as ChromeService; import repo_helper.screenshot as s; s._create_driver = lambda w, h: s.webdriver.Chrome(service=ChromeService('/usr/bin/chromedriver'), options=s._chrome_options_for_size(w, h)); raise SystemExit(s.main(['--config', 'screenshots.ini']))"
	repo-common-image-framer

.PHONY: update-screenshots
