package receiver

import (
	"encoding/json"
	"fmt"
	log "github.com/sirupsen/logrus"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

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

func ReceiveWebhook(w http.ResponseWriter, req *http.Request) {
	var webhook Webhook

	if err := json.NewDecoder(req.Body).Decode(&webhook); err != nil {
		log.Errorf("Decode err: %v", err)
		http.Error(w, "invalid JSON payload", http.StatusBadRequest)
		return
	}

	log.Infof("Webhook: %+v", webhook)

	alertMu.Lock()
	for i := range webhook.Alerts {
		alert := &webhook.Alerts[i]
		key := alertKey(alert)

		if alert.Status == "resolved" {
			delete(alertMap, key)
			continue
		}

		handleAlert(alert)
		alertMap[key] = alert
	}
	lastUpdated = time.Now().Unix()
	alertMu.Unlock()

	w.WriteHeader(http.StatusOK)
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
	w.Header().Set("Access-Control-Allow-Origin", "*")

	alertMu.RLock()
	res := AlertListResponse{
		LastUpdated: lastUpdated,
		Alerts:      alertMap,
	}
	alertMu.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}

type AlertListResponse struct {
	LastUpdated int64
	Alerts      map[string]*Alert
}
