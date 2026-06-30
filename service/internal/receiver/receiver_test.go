package receiver

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func resetAlertsForTest(t *testing.T) {
	t.Helper()

	alertMu.Lock()
	alertMap = make(map[string]*Alert)
	lastUpdated = 0
	alertMu.Unlock()
}

func postWebhook(t *testing.T, body string) *httptest.ResponseRecorder {
	t.Helper()

	req := httptest.NewRequest(http.MethodPost, "/alerts", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	ReceiveWebhook(rec, req)
	return rec
}

func seedAlerts(t *testing.T, alerts map[string]*Alert) {
	t.Helper()

	alertMu.Lock()
	alertMap = alerts
	lastUpdated = 42
	alertMu.Unlock()
}

func TestReceiveWebhook_validPayload(t *testing.T) {
	resetAlertsForTest(t)

	rec := postWebhook(t, `{
		"alerts": [
			{
				"fingerprint": "abc123",
				"labels": {"job": "up", "instance": "host1", "severity": "crit"},
				"annotations": {"summary": "Target down"}
			},
			{
				"labels": {"job": "disk"},
				"annotations": {"summary": "Disk full"}
			}
		]
	}`)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d; body = %q", rec.Code, http.StatusOK, rec.Body.String())
	}

	alertMu.RLock()
	defer alertMu.RUnlock()

	if len(alertMap) != 2 {
		t.Fatalf("alert count = %d, want 2", len(alertMap))
	}

	if alertMap["abc123"] == nil {
		t.Fatal("expected fingerprint key abc123")
	}
	if alertMap["Disk full"] == nil {
		t.Fatal("expected summary key Disk full")
	}
	if lastUpdated == 0 {
		t.Fatal("expected lastUpdated to be set")
	}
}

func TestReceiveWebhook_invalidPayloadPreservesExistingAlerts(t *testing.T) {
	resetAlertsForTest(t)

	existing := &Alert{
		Annotations: map[string]string{"summary": "keep me"},
		Labels:      map[string]string{"severity": "crit"},
	}
	seedAlerts(t, map[string]*Alert{"keep me": existing})

	rec := postWebhook(t, `not json`)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusBadRequest)
	}

	alertMu.RLock()
	defer alertMu.RUnlock()

	if len(alertMap) != 1 {
		t.Fatalf("alert count = %d, want 1", len(alertMap))
	}
	if alertMap["keep me"] != existing {
		t.Fatal("existing alert was replaced")
	}
	if lastUpdated != 42 {
		t.Fatalf("lastUpdated = %d, want 42", lastUpdated)
	}
}

func TestReceiveWebhook_replacesAlertsOnValidPayload(t *testing.T) {
	resetAlertsForTest(t)

	seedAlerts(t, map[string]*Alert{
		"old": {Annotations: map[string]string{"summary": "old"}},
	})

	rec := postWebhook(t, `{"alerts":[{"annotations":{"summary":"new"}}]}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}

	alertMu.RLock()
	defer alertMu.RUnlock()

	if len(alertMap) != 1 {
		t.Fatalf("alert count = %d, want 1", len(alertMap))
	}
	if alertMap["new"] == nil {
		t.Fatal("expected new alert")
	}
	if alertMap["old"] != nil {
		t.Fatal("expected old alert to be removed")
	}
}

func TestGetAllAlerts(t *testing.T) {
	resetAlertsForTest(t)

	seedAlerts(t, map[string]*Alert{
		"Disk full": {
			Annotations: map[string]string{"summary": "Disk full"},
			Labels:      map[string]string{"severity": "warning"},
			Metadata:    struct{ AlertManagerUrl string }{AlertManagerUrl: "#"},
		},
	})

	req := httptest.NewRequest(http.MethodGet, "/api/alert_list", nil)
	rec := httptest.NewRecorder()
	GetAllAlerts(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "*" {
		t.Fatalf("CORS header = %q, want *", got)
	}

	var res AlertListResponse
	if err := json.NewDecoder(rec.Body).Decode(&res); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if res.LastUpdated != 42 {
		t.Fatalf("LastUpdated = %d, want 42", res.LastUpdated)
	}
	if len(res.Alerts) != 1 {
		t.Fatalf("alert count = %d, want 1", len(res.Alerts))
	}
	if res.Alerts["Disk full"].Annotations["summary"] != "Disk full" {
		t.Fatal("unexpected alert summary")
	}
}

func TestBuildURL(t *testing.T) {
	alert := &Alert{
		Labels: map[string]string{"job": "up", "instance": "host1"},
	}

	t.Run("without host", func(t *testing.T) {
		t.Setenv("ALERTMANAGER_HOST", "")
		handleAlert(alert)
		if alert.Metadata.AlertManagerUrl != "#" {
			t.Fatalf("url = %q, want #", alert.Metadata.AlertManagerUrl)
		}
	})

	t.Run("with host", func(t *testing.T) {
		t.Setenv("ALERTMANAGER_HOST", "http://alertmanager.example")
		handleAlert(alert)
		want := `http://alertmanager.example/#/alerts?filter={job%3D"up"%2C%20instance%3D"host1"}`
		if alert.Metadata.AlertManagerUrl != want {
			t.Fatalf("url = %q, want %q", alert.Metadata.AlertManagerUrl, want)
		}
	})
}

func TestBuildURLFilter(t *testing.T) {
	tests := []struct {
		name   string
		labels map[string]string
		want   string
	}{
		{
			name:   "job only",
			labels: map[string]string{"job": "up"},
			want:   `job%3D"up"`,
		},
		{
			name:   "job and instance",
			labels: map[string]string{"job": "up", "instance": "host1"},
			want:   `job%3D"up"%2C%20instance%3D"host1"`,
		},
		{
			name:   "no filter labels",
			labels: map[string]string{"severity": "crit"},
			want:   "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := buildURLFilter(&Alert{Labels: tt.labels})
			if got != tt.want {
				t.Fatalf("filter = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestAlertKey(t *testing.T) {
	tests := []struct {
		name  string
		alert Alert
		want  string
	}{
		{
			name:  "fingerprint preferred",
			alert: Alert{Fingerprint: "fp1", Annotations: map[string]string{"summary": "summary"}},
			want:  "fp1",
		},
		{
			name:  "summary fallback",
			alert: Alert{Annotations: map[string]string{"summary": "Disk full"}},
			want:  "Disk full",
		},
		{
			name:  "labels fallback",
			alert: Alert{Labels: map[string]string{"job": "up"}},
			want:  "map[job:up]",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := alertKey(&tt.alert)
			if got != tt.want {
				t.Fatalf("key = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestReceiveWebhook_alertManagerURLSetOnStoredAlerts(t *testing.T) {
	resetAlertsForTest(t)
	t.Setenv("ALERTMANAGER_HOST", "http://alertmanager.example")

	rec := postWebhook(t, `{"alerts":[{"annotations":{"summary":"x"},"labels":{"job":"up"}}]}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}

	alertMu.RLock()
	defer alertMu.RUnlock()

	alert := alertMap["x"]
	if alert == nil {
		t.Fatal("expected alert x")
	}
	if !strings.HasPrefix(alert.Metadata.AlertManagerUrl, "http://alertmanager.example") {
		t.Fatalf("url = %q, want alertmanager prefix", alert.Metadata.AlertManagerUrl)
	}
}

func TestGetAllAlerts_empty(t *testing.T) {
	resetAlertsForTest(t)

	req := httptest.NewRequest(http.MethodGet, "/api/alert_list", nil)
	rec := httptest.NewRecorder()
	GetAllAlerts(rec, req)

	var res AlertListResponse
	if err := json.NewDecoder(bytes.NewReader(rec.Body.Bytes())).Decode(&res); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if res.LastUpdated != 0 {
		t.Fatalf("LastUpdated = %d, want 0", res.LastUpdated)
	}
	if len(res.Alerts) != 0 {
		t.Fatalf("alert count = %d, want 0", len(res.Alerts))
	}
}
