package receiver

import (
	"testing"
	"time"
)

func lastUpdatedUnix(t *testing.T) int64 {
	t.Helper()

	alertMu.RLock()
	defer alertMu.RUnlock()

	return lastUpdated
}

func TestDemoInterval(t *testing.T) {
	if demoInterval != 3*time.Minute {
		t.Fatalf("demoInterval = %v, want 3m", demoInterval)
	}
}

func TestDemoEnabled(t *testing.T) {
	t.Setenv("DEMO", "")
	if demoEnabled() {
		t.Fatal("empty DEMO should be disabled")
	}

	t.Setenv("DEMO", "1")
	if !demoEnabled() {
		t.Fatal("non-empty DEMO should be enabled")
	}
}

func TestParseDemoWebhook(t *testing.T) {
	webhook, err := parseDemoWebhook()
	if err != nil {
		t.Fatalf("parse demo webhook: %v", err)
	}
	if len(webhook.Alerts) != 9 {
		t.Fatalf("alert count = %d, want 9", len(webhook.Alerts))
	}

	alert := webhook.Alerts[0]
	if alert.Annotations["summary"] == "" {
		t.Fatal("expected demo alert summary")
	}
	if alert.StartsAt.IsZero() {
		t.Fatal("expected demo alert startsAt")
	}
}

func TestInjectDemoAlerts(t *testing.T) {
	resetAlertsForTest(t)

	injectDemoAlerts()

	if got := len(alertSnapshot(t)); got != 9 {
		t.Fatalf("alert count = %d, want 9", got)
	}
	if lastUpdatedUnix(t) == 0 {
		t.Fatal("expected lastUpdated to be set")
	}
}

func TestStartDemo_disabled(t *testing.T) {
	resetAlertsForTest(t)
	t.Setenv("DEMO", "")

	StartDemo()

	if got := len(alertSnapshot(t)); got != 0 {
		t.Fatalf("alert count = %d, want 0", got)
	}
}

func TestStartDemo_enabledInjectsImmediately(t *testing.T) {
	resetAlertsForTest(t)
	t.Setenv("DEMO", "1")

	StartDemo()

	if got := len(alertSnapshot(t)); got != 9 {
		t.Fatalf("alert count = %d, want 9", got)
	}
}

func TestRunDemoLoop_reinjectsOnTick(t *testing.T) {
	resetAlertsForTest(t)

	ticker := time.NewTicker(20 * time.Millisecond)
	stop := make(chan struct{})
	t.Cleanup(func() {
		close(stop)
		ticker.Stop()
	})

	runDemoLoop(ticker, stop)

	first := lastUpdatedUnix(t)
	if first == 0 {
		t.Fatal("expected immediate inject")
	}

	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
		if lastUpdatedUnix(t) > first {
			return
		}
	}

	t.Fatal("expected demo alerts to be re-injected on tick")
}

func alertSnapshot(t *testing.T) map[string]*Alert {
	t.Helper()

	alertMu.RLock()
	defer alertMu.RUnlock()

	snapshot := make(map[string]*Alert, len(alertMap))
	for key, alert := range alertMap {
		snapshot[key] = alert
	}

	return snapshot
}
