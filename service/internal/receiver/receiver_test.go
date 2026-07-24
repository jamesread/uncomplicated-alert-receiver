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
	return postWebhookWithAuth(t, body, "")
}

func postWebhookWithAuth(t *testing.T, body string, bearerToken string) *httptest.ResponseRecorder {
	t.Helper()

	req := httptest.NewRequest(http.MethodPost, "/alerts", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if bearerToken != "" {
		req.Header.Set("Authorization", "Bearer "+bearerToken)
	}
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

func TestReceiveWebhook_mergesGroupedFiringAlerts(t *testing.T) {
	resetAlertsForTest(t)

	rec1 := postWebhook(t, `{
		"alerts": [
			{
				"status": "firing",
				"fingerprint": "group-a",
				"annotations": {"summary": "A"}
			}
		]
	}`)
	if rec1.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec1.Code, http.StatusOK)
	}

	rec2 := postWebhook(t, `{
		"alerts": [
			{
				"status": "firing",
				"fingerprint": "group-b",
				"annotations": {"summary": "B"}
			}
		]
	}`)
	if rec2.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec2.Code, http.StatusOK)
	}

	alertMu.RLock()
	defer alertMu.RUnlock()

	if len(alertMap) != 2 {
		t.Fatalf("alert count = %d, want 2", len(alertMap))
	}
	if alertMap["group-a"] == nil {
		t.Fatal("expected group-a to remain after second group webhook")
	}
	if alertMap["group-b"] == nil {
		t.Fatal("expected group-b to be merged in")
	}
}

func TestReceiveWebhook_resolvedRemovesAlertKeepsOthers(t *testing.T) {
	resetAlertsForTest(t)

	postWebhook(t, `{
		"alerts": [
			{"status": "firing", "fingerprint": "keep", "annotations": {"summary": "still firing"}},
			{"status": "firing", "fingerprint": "drop", "annotations": {"summary": "will resolve"}}
		]
	}`)

	rec := postWebhook(t, `{
		"alerts": [
			{
				"status": "resolved",
				"fingerprint": "drop",
				"annotations": {"summary": "will resolve"}
			},
			{
				"annotations": {"summary": "legacy no status"}
			}
		]
	}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}

	alertMu.RLock()
	defer alertMu.RUnlock()

	if len(alertMap) != 2 {
		t.Fatalf("alert count = %d, want 2", len(alertMap))
	}
	if alertMap["keep"] == nil {
		t.Fatal("expected firing alert keep")
	}
	if alertMap["legacy no status"] == nil {
		t.Fatal("expected alert with empty status")
	}
	if alertMap["drop"] != nil {
		t.Fatal("expected resolved alert to be removed")
	}
	if lastUpdated == 0 {
		t.Fatal("expected lastUpdated to be set")
	}
}

func TestReceiveWebhook_allResolvedClearsAlerts(t *testing.T) {
	resetAlertsForTest(t)

	postWebhook(t, `{
		"alerts": [
			{"status": "firing", "fingerprint": "fp1", "annotations": {"summary": "one"}},
			{"status": "firing", "fingerprint": "fp2", "annotations": {"summary": "two"}}
		]
	}`)

	rec := postWebhook(t, `{
		"alerts": [
			{"status": "resolved", "fingerprint": "fp1", "annotations": {"summary": "one"}},
			{"status": "resolved", "fingerprint": "fp2", "annotations": {"summary": "two"}}
		]
	}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}

	alertMu.RLock()
	defer alertMu.RUnlock()

	if len(alertMap) != 0 {
		t.Fatalf("alert count = %d, want 0", len(alertMap))
	}
	if lastUpdated == 0 {
		t.Fatal("expected lastUpdated to be set")
	}
}

func TestReceiveWebhook_emptyAlertsUpdatesLastUpdatedOnly(t *testing.T) {
	resetAlertsForTest(t)

	postWebhook(t, `{
		"alerts": [
			{"status": "firing", "fingerprint": "fp1", "annotations": {"summary": "one"}}
		]
	}`)

	alertMu.RLock()
	before := lastUpdated
	alertMu.RUnlock()

	rec := postWebhook(t, `{"alerts":[]}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}

	alertMu.RLock()
	defer alertMu.RUnlock()

	if len(alertMap) != 1 {
		t.Fatalf("alert count = %d, want 1", len(alertMap))
	}
	if alertMap["fp1"] == nil {
		t.Fatal("expected existing alert to remain")
	}
	if lastUpdated < before {
		t.Fatalf("lastUpdated = %d, want >= %d", lastUpdated, before)
	}
}

func TestGetAllAlerts(t *testing.T) {
	resetAlertsForTest(t)
	t.Setenv("CORS_ORIGIN", "")

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
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Fatalf("CORS header = %q, want empty by default", got)
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

func TestReceiveWebhook_authOptionalWhenTokenUnset(t *testing.T) {
	resetAlertsForTest(t)
	t.Setenv("WEBHOOK_TOKEN", "")

	rec := postWebhook(t, `{"alerts":[{"fingerprint":"open","annotations":{"summary":"x"}}]}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
}

func TestReceiveWebhook_authRejectsMissingOrWrongToken(t *testing.T) {
	resetAlertsForTest(t)
	t.Setenv("WEBHOOK_TOKEN", "secret-token")

	existing := &Alert{Annotations: map[string]string{"summary": "keep"}}
	seedAlerts(t, map[string]*Alert{"keep": existing})

	missing := postWebhook(t, `{"alerts":[{"fingerprint":"evil","annotations":{"summary":"nope"}}]}`)
	if missing.Code != http.StatusUnauthorized {
		t.Fatalf("missing token status = %d, want %d", missing.Code, http.StatusUnauthorized)
	}

	wrong := postWebhookWithAuth(t, `{"alerts":[{"fingerprint":"evil","annotations":{"summary":"nope"}}]}`, "wrong")
	if wrong.Code != http.StatusUnauthorized {
		t.Fatalf("wrong token status = %d, want %d", wrong.Code, http.StatusUnauthorized)
	}

	alertMu.RLock()
	defer alertMu.RUnlock()
	if len(alertMap) != 1 || alertMap["keep"] != existing {
		t.Fatal("store mutated after unauthorized request")
	}
}

func TestReceiveWebhook_authAcceptsMatchingBearer(t *testing.T) {
	resetAlertsForTest(t)
	t.Setenv("WEBHOOK_TOKEN", "secret-token")

	rec := postWebhookWithAuth(t, `{"alerts":[{"fingerprint":"ok","annotations":{"summary":"x"}}]}`, "secret-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d; body = %q", rec.Code, http.StatusOK, rec.Body.String())
	}

	alertMu.RLock()
	defer alertMu.RUnlock()
	if alertMap["ok"] == nil {
		t.Fatal("expected alert ok to be stored")
	}
}

func TestGetAllAlerts_corsOrigin(t *testing.T) {
	resetAlertsForTest(t)

	t.Run("custom origin", func(t *testing.T) {
		t.Setenv("CORS_ORIGIN", "https://noc.example.com")
		req := httptest.NewRequest(http.MethodGet, "/api/alert_list", nil)
		rec := httptest.NewRecorder()
		GetAllAlerts(rec, req)
		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "https://noc.example.com" {
			t.Fatalf("CORS header = %q, want https://noc.example.com", got)
		}
	})

	t.Run("wildcard", func(t *testing.T) {
		t.Setenv("CORS_ORIGIN", "*")
		req := httptest.NewRequest(http.MethodGet, "/api/alert_list", nil)
		rec := httptest.NewRecorder()
		GetAllAlerts(rec, req)
		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "*" {
			t.Fatalf("CORS header = %q, want *", got)
		}
	})
}

func TestReceiveWebhook_bodyTooLarge(t *testing.T) {
	resetAlertsForTest(t)

	existing := &Alert{Annotations: map[string]string{"summary": "keep"}}
	seedAlerts(t, map[string]*Alert{"keep": existing})

	oversized := `{"alerts":[{"fingerprint":"x","annotations":{"summary":"` + strings.Repeat("a", MaxWebhookBodyBytes) + `"}}]}`
	rec := postWebhook(t, oversized)
	if rec.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusRequestEntityTooLarge)
	}

	alertMu.RLock()
	defer alertMu.RUnlock()
	if len(alertMap) != 1 || alertMap["keep"] != existing {
		t.Fatal("store mutated after oversized body")
	}
}

func TestReceiveWebhook_alertCapRejectsNewAllowsUpdateAndResolve(t *testing.T) {
	resetAlertsForTest(t)
	prev := maxAlerts
	maxAlerts = 2
	t.Cleanup(func() { maxAlerts = prev })

	seedAlerts(t, map[string]*Alert{
		"a": {Fingerprint: "a", Annotations: map[string]string{"summary": "a"}},
		"b": {Fingerprint: "b", Annotations: map[string]string{"summary": "b"}},
	})

	reject := postWebhook(t, `{"alerts":[{"status":"firing","fingerprint":"c","annotations":{"summary":"c"}}]}`)
	if reject.Code != http.StatusServiceUnavailable {
		t.Fatalf("new alert status = %d, want %d", reject.Code, http.StatusServiceUnavailable)
	}

	update := postWebhook(t, `{"alerts":[{"status":"firing","fingerprint":"a","annotations":{"summary":"a-updated"}}]}`)
	if update.Code != http.StatusOK {
		t.Fatalf("update status = %d, want %d", update.Code, http.StatusOK)
	}

	resolveAndAdd := postWebhook(t, `{
		"alerts": [
			{"status":"resolved","fingerprint":"b","annotations":{"summary":"b"}},
			{"status":"firing","fingerprint":"c","annotations":{"summary":"c"}}
		]
	}`)
	if resolveAndAdd.Code != http.StatusOK {
		t.Fatalf("resolve+add status = %d, want %d; body = %q", resolveAndAdd.Code, http.StatusOK, resolveAndAdd.Body.String())
	}

	alertMu.RLock()
	defer alertMu.RUnlock()
	if len(alertMap) != 2 {
		t.Fatalf("alert count = %d, want 2", len(alertMap))
	}
	if alertMap["a"] == nil || alertMap["a"].Annotations["summary"] != "a-updated" {
		t.Fatal("expected alert a to be updated")
	}
	if alertMap["b"] != nil {
		t.Fatal("expected alert b to be resolved")
	}
	if alertMap["c"] == nil {
		t.Fatal("expected alert c to be added after resolve freed capacity")
	}
}
