package runtimeconfig

import (
	"reflect"
	"testing"
)

func TestGet_defaultSeverityLabels(t *testing.T) {
	clearRuntimeEnv(t)

	cfg := Get()

	want := map[string]int{
		"crit":         1,
		"critical":     1,
		"severe":       2,
		"warning":      3,
		"important":    4,
		"info":         5,
		"information":  5,
	}

	if !reflect.DeepEqual(cfg.SeverityLabels, want) {
		t.Fatalf("SeverityLabels = %#v, want %#v", cfg.SeverityLabels, want)
	}
}

func TestGet_customSeverityLabels(t *testing.T) {
	clearRuntimeEnv(t)
	t.Setenv("SEV_LABELS_1", " page, down ")
	t.Setenv("SEV_LABELS_3", "warn")

	cfg := Get()

	if cfg.SeverityLabels["page"] != 1 {
		t.Fatalf("page level = %d, want 1", cfg.SeverityLabels["page"])
	}
	if cfg.SeverityLabels["down"] != 1 {
		t.Fatalf("down level = %d, want 1", cfg.SeverityLabels["down"])
	}
	if cfg.SeverityLabels["warn"] != 3 {
		t.Fatalf("warn level = %d, want 3", cfg.SeverityLabels["warn"])
	}
	if _, ok := cfg.SeverityLabels[""]; ok {
		t.Fatal("empty label should not be stored")
	}
}

func TestGet_defaultIgnoredLabels(t *testing.T) {
	clearRuntimeEnv(t)

	cfg := Get()

	want := []string{"alertname", "instance", "job", "severity"}
	if !reflect.DeepEqual(cfg.IgnoredLabels, want) {
		t.Fatalf("IgnoredLabels = %#v, want %#v", cfg.IgnoredLabels, want)
	}
}

func TestGet_customIgnoredLabels(t *testing.T) {
	clearRuntimeEnv(t)
	t.Setenv("IGNORED_LABELS", " alertname , cluster , , namespace ")

	cfg := Get()

	want := []string{"alertname", "cluster", "namespace"}
	if !reflect.DeepEqual(cfg.IgnoredLabels, want) {
		t.Fatalf("IgnoredLabels = %#v, want %#v", cfg.IgnoredLabels, want)
	}
}

func clearRuntimeEnv(t *testing.T) {
	t.Helper()

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
}
