package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
)

func TestGetListenAddress(t *testing.T) {
	t.Run("default port", func(t *testing.T) {
		t.Setenv("PORT", "")
		if got := getListenAddress(); got != ":8080" {
			t.Fatalf("addr = %q, want :8080", got)
		}
	})

	t.Run("custom port", func(t *testing.T) {
		t.Setenv("PORT", "9090")
		if got := getListenAddress(); got != ":9090" {
			t.Fatalf("addr = %q, want :9090", got)
		}
	})
}

func TestGetSettings(t *testing.T) {
	t.Setenv("DRAW_LABELS", "")
	t.Setenv("CORS_ORIGIN", "")
	for _, key := range []string{
		"SEV_LABELS_1",
		"SEV_LABELS_2",
		"SEV_LABELS_3",
		"SEV_LABELS_4",
		"SEV_LABELS_5",
		"IGNORED_LABELS",
	} {
		t.Setenv(key, "")
	}

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/api/settings", nil)
	rec := httptest.NewRecorder()
	getSettings(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Fatalf("CORS header = %q, want empty by default", got)
	}

	var settings Settings
	if err := json.NewDecoder(rec.Body).Decode(&settings); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if settings.Version == "" {
		t.Fatal("expected version to be set")
	}
	if settings.DrawLabels {
		t.Fatal("DrawLabels should be false by default")
	}
	if settings.SeverityLabels["crit"] != 1 {
		t.Fatalf("crit level = %d, want 1", settings.SeverityLabels["crit"])
	}
	if len(settings.IgnoredLabels) == 0 {
		t.Fatal("expected default ignored labels")
	}
}

func TestGetSettings_drawLabelsEnabled(t *testing.T) {
	t.Setenv("DRAW_LABELS", "1")

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/api/settings", nil)
	rec := httptest.NewRecorder()
	getSettings(rec, req)

	var settings Settings
	if err := json.NewDecoder(rec.Body).Decode(&settings); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if !settings.DrawLabels {
		t.Fatal("DrawLabels should be true when env var is set")
	}
}

func TestGetSettings_corsOrigin(t *testing.T) {
	t.Run("default empty", func(t *testing.T) {
		t.Setenv("CORS_ORIGIN", "")
		req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/api/settings", nil)
		rec := httptest.NewRecorder()
		getSettings(rec, req)
		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
			t.Fatalf("CORS header = %q, want empty", got)
		}
	})

	t.Run("custom origin", func(t *testing.T) {
		t.Setenv("CORS_ORIGIN", "https://noc.example.com")
		req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/api/settings", nil)
		rec := httptest.NewRecorder()
		getSettings(rec, req)
		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "https://noc.example.com" {
			t.Fatalf("CORS header = %q, want https://noc.example.com", got)
		}
	})

	t.Run("wildcard", func(t *testing.T) {
		t.Setenv("CORS_ORIGIN", "*")
		req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/api/settings", nil)
		rec := httptest.NewRecorder()
		getSettings(rec, req)
		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "*" {
			t.Fatalf("CORS header = %q, want *", got)
		}
	})
}

func TestFindWebuiDir(t *testing.T) {
	wd, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}

	// From service/, ../frontend/ should exist in this repo layout.
	if _, err := os.Stat(wd + "/../frontend"); os.IsNotExist(err) {
		t.Skip("frontend directory not present in this checkout")
	}

	got := findWebuiDir()
	if got != "../frontend/" {
		t.Fatalf("webui dir = %q, want ../frontend/", got)
	}
}
