package receiver

import (
	_ "embed"
	"encoding/json"
	"os"
	"time"

	log "github.com/sirupsen/logrus"
)

//go:embed testing-data.json
var demoWebhookJSON []byte

const demoInterval = 3 * time.Minute

func demoEnabled() bool {
	return os.Getenv("DEMO") != ""
}

func StartDemo() {
	if !demoEnabled() {
		return
	}

	log.Info("DEMO mode: injecting sample alerts every 3 minutes")
	runDemoLoop(time.NewTicker(demoInterval), nil)
}

func runDemoLoop(ticker *time.Ticker, stop <-chan struct{}) {
	injectDemoAlerts()
	go consumeDemoTicks(ticker, stop)
}

func consumeDemoTicks(ticker *time.Ticker, stop <-chan struct{}) {
	for nextDemoTick(ticker.C, stop) {
		injectDemoAlerts()
	}
}

func nextDemoTick(ticks <-chan time.Time, stop <-chan struct{}) bool {
	select {
	case <-ticks:
		return true
	case <-stop:
		return false
	}
}

func injectDemoAlerts() {
	webhook, err := parseDemoWebhook()
	if err != nil {
		log.Errorf("DEMO payload: %v", err)
		return
	}

	if storeWebhookAlerts(webhook.Alerts) {
		return
	}

	log.Errorf("DEMO inject rejected: alert store at capacity")
}

func parseDemoWebhook() (Webhook, error) {
	var webhook Webhook
	err := json.Unmarshal(demoWebhookJSON, &webhook)
	return webhook, err
}
