# Regenerates marketing screenshots against a throwaway receiver seeded with
# fictional alerts. Run `make` here; everything is torn down afterwards.
#
# UAR keeps alerts in memory and has no database or broker, so the "stack" is
# just the service binary and the Vite dev server on non-default ports.

ROOT := $(abspath ../../..)
HERE := $(abspath .)
TMP := $(HERE)/tmp

BACKEND_PORT := 18480
BACKEND_URL := http://127.0.0.1:$(BACKEND_PORT)
FRONTEND_PORT := 18400

DOCS_ASSETS := $(ROOT)/docs/assets/marketing
DOCS_IMAGES := board.png filtered.png preferences.png board-dark.png

.PHONY: all build up seed shoot manifest publish down clean

all:
	@$(MAKE) build up seed shoot manifest publish; rc=$$?; $(MAKE) down; exit $$rc

build:
	$(MAKE) -C $(ROOT)/service
	[ -d $(ROOT)/frontend/node_modules ] || (cd $(ROOT)/frontend && npm ci)

up:
	mkdir -p $(TMP)
	cd $(TMP) && { PORT=$(BACKEND_PORT) DRAW_LABELS=1 ALERTMANAGER_HOST=https://alertmanager.example.com \
		$(ROOT)/service/uar > $(TMP)/service.log 2>&1 & echo $$! > $(TMP)/service.pid; }
	@for i in $$(seq 30); do curl -fsS $(BACKEND_URL)/api/alert_list >/dev/null 2>&1 && exit 0; sleep 1; done; \
		echo "Backend did not start; see $(TMP)/service.log"; exit 1
	# vite.config.js proxies /api to localhost:$$PORT.
	cd $(ROOT)/frontend && { PORT=$(BACKEND_PORT) npx vite --host 127.0.0.1 --port $(FRONTEND_PORT) --strictPort \
		> $(TMP)/frontend.log 2>&1 & echo $$! > $(TMP)/frontend.pid; }
	@for i in $$(seq 60); do curl -fsS http://127.0.0.1:$(FRONTEND_PORT)/ >/dev/null 2>&1 && exit 0; sleep 1; done; \
		echo "Frontend did not start; see $(TMP)/frontend.log"; exit 1

# Seed last, right before shooting: the header flags "Last result" once the
# last webhook is more than 100s old.
seed:
	./seed.sh $(BACKEND_URL)

shoot:
	repo-helper screenshot --config screenshots.ini

manifest:
	./generate-manifest.py

publish:
	mkdir -p $(DOCS_ASSETS)
	cp $(DOCS_IMAGES) $(DOCS_ASSETS)/

down:
	-@for p in frontend service; do \
		[ -f $(TMP)/$$p.pid ] && pkill -P $$(cat $(TMP)/$$p.pid) 2>/dev/null; \
		[ -f $(TMP)/$$p.pid ] && kill $$(cat $(TMP)/$$p.pid) 2>/dev/null; \
		rm -f $(TMP)/$$p.pid; done; true

clean: down
	rm -rf $(TMP)
