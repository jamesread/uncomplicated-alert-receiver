package receiver

import (
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	log "github.com/sirupsen/logrus"
)

const (
	MaxWebhookBodyBytes = 1 << 20 // 1 MiB
	DefaultMaxAlerts    = 1000
)

var maxAlerts = DefaultMaxAlerts

type Webhook struct {
	Alerts []Alert
}

type Alert struct {
	Status      string
	Fingerprint string
	Annotations map[string]string
	Labels      map[string]string
	Metadata    struct {
		AlertManagerUrl string
	}
}

var (
	alertMu     sync.RWMutex
	alertMap    = make(map[string]*Alert)
	lastUpdated int64
)

func SetCORSOrigin(w http.ResponseWriter) {
	if origin := os.Getenv("CORS_ORIGIN"); origin != "" {
		w.Header().Set("Access-Control-Allow-Origin", origin)
	}
}

func ReceiveWebhook(w http.ResponseWriter, req *http.Request) {
	if !authorizedWebhook(req) {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	webhook, ok := decodeWebhook(w, req)
	if !ok {
		return
	}

	log.Infof("Webhook: %+v", webhook)

	if !storeWebhookAlerts(webhook.Alerts) {
		log.Errorf("Alert map at capacity (%d); rejecting webhook with new alerts", maxAlerts)
		http.Error(w, "alert store at capacity", http.StatusServiceUnavailable)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func decodeWebhook(w http.ResponseWriter, req *http.Request) (Webhook, bool) {
	limited := http.MaxBytesReader(w, req.Body, MaxWebhookBodyBytes)
	body, err := io.ReadAll(limited)
	if err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			log.Errorf("Webhook body exceeds %d bytes", MaxWebhookBodyBytes)
			http.Error(w, "request body too large", http.StatusRequestEntityTooLarge)
			return Webhook{}, false
		}
		log.Errorf("Read body err: %v", err)
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return Webhook{}, false
	}

	var webhook Webhook
	if err := json.Unmarshal(body, &webhook); err != nil {
		log.Errorf("Decode err: %v", err)
		http.Error(w, "invalid JSON payload", http.StatusBadRequest)
		return Webhook{}, false
	}

	return webhook, true
}

func storeWebhookAlerts(alerts []Alert) bool {
	alertMu.Lock()
	defer alertMu.Unlock()

	if wouldExceedAlertCap(alerts) {
		return false
	}

	for i := range alerts {
		alert := &alerts[i]
		key := alertKey(alert)

		if alert.Status == "resolved" {
			delete(alertMap, key)
			continue
		}

		handleAlert(alert)
		alertMap[key] = alert
	}
	lastUpdated = time.Now().Unix()

	return true
}

func authorizedWebhook(req *http.Request) bool {
	expected := os.Getenv("WEBHOOK_TOKEN")
	if expected == "" {
		return true
	}

	auth := req.Header.Get("Authorization")
	const prefix = "Bearer "
	if !strings.HasPrefix(auth, prefix) {
		return false
	}

	got := auth[len(prefix):]
	return subtle.ConstantTimeCompare([]byte(got), []byte(expected)) == 1
}

func wouldExceedAlertCap(alerts []Alert) bool {
	projected := len(alertMap)

	for i := range alerts {
		alert := &alerts[i]
		key := alertKey(alert)
		_, exists := alertMap[key]

		if alert.Status == "resolved" {
			if exists {
				projected--
			}
			continue
		}

		if !exists {
			projected++
		}
	}

	return projected > maxAlerts
}

func alertKey(alert *Alert) string {
	if alert.Fingerprint != "" {
		return alert.Fingerprint
	}

	summary := alert.Annotations["summary"]
	if summary != "" {
		return summary
	}

	return fmt.Sprintf("%v", alert.Labels)
}

func handleAlert(alert *Alert) {
	log.Infof("Alert: %+v", alert)
	alert.Metadata.AlertManagerUrl = buildURL(alert)
}

func buildURL(alert *Alert) string {
	host := os.Getenv("ALERTMANAGER_HOST")

	if host == "" {
		return "#"
	}

	return fmt.Sprintf("%v/#/alerts?filter={%v}", host, buildURLFilter(alert))
}

func buildURLFilter(alert *Alert) string {
	filterKeys := []string{"job", "instance"}
	parts := make([]string, 0, len(filterKeys))

	for _, k := range filterKeys {
		if v, ok := alert.Labels[k]; ok {
			parts = append(parts, fmt.Sprintf("%v%%3D%q", k, v))
		}
	}

	return strings.Join(parts, "%2C%20")
}

func GetAllAlerts(w http.ResponseWriter, req *http.Request) {
	SetCORSOrigin(w)

	alertMu.RLock()
	res := AlertListResponse{
		LastUpdated: lastUpdated,
		Alerts:      alertMap,
	}
	alertMu.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(res); err != nil {
		log.Errorf("Encode alert list response: %v", err)
	}
}

type AlertListResponse struct {
	Alerts      map[string]*Alert
	LastUpdated int64
}
