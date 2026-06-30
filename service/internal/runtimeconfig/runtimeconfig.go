package runtimeconfig

import (
	"os"
	"strings"
)

type RuntimeConfig struct {
	SeverityLabels map[string]int
	IgnoredLabels  []string
}

func (c *RuntimeConfig) putSeverityLabels(envvar string, defaultLabels string, level int) {
	labels := os.Getenv(envvar)
	if labels == "" {
		labels = defaultLabels
	}

	for _, label := range strings.Split(labels, ",") {
		label = strings.TrimSpace(label)
		if label != "" {
			c.SeverityLabels[label] = level
		}
	}
}

func Get() *RuntimeConfig {
	cfg := &RuntimeConfig{
		SeverityLabels: make(map[string]int),
	}

	cfg.putSeverityLabels("SEV_LABELS_1", "crit,critical", 1)
	cfg.putSeverityLabels("SEV_LABELS_2", "severe", 2)
	cfg.putSeverityLabels("SEV_LABELS_3", "warning", 3)
	cfg.putSeverityLabels("SEV_LABELS_4", "important", 4)
	cfg.putSeverityLabels("SEV_LABELS_5", "info,information", 5)

	cfg.IgnoredLabels = getEnvArray("IGNORED_LABELS", []string{"alertname", "instance", "job", "severity"})

	return cfg
}

func getEnvArray(envvar string, def []string) []string {
	env := os.Getenv(envvar)

	if env != "" {
		parts := strings.Split(env, ",")
		result := make([]string, 0, len(parts))
		for _, part := range parts {
			part = strings.TrimSpace(part)
			if part != "" {
				result = append(result, part)
			}
		}
		return result
	}

	return def
}
