package main

import (
	"encoding/json"
	"fmt"
	log "github.com/sirupsen/logrus"
	"net/http"
	"os"
	"strings"
)

type Webhook struct {
	Version string
	Alerts  []Alert
}

type Alert struct {
	Status      string
	Annotations map[string]string
	Labels      map[string]string
	Metadata    struct {
		AlertManagerUrl string
	}
}

var alertMap = make(map[string]*Alert)

func receiveWebhook(w http.ResponseWriter, req *http.Request) {
	decoder := json.NewDecoder(req.Body)

	var webhook Webhook

	err := decoder.Decode(&webhook)

	if err != nil {
		log.Errorf("Decode err: %v", err)
	}

	log.Infof("Webhook: %+v", webhook)

	clear(alertMap)

	for _, alert := range webhook.Alerts {
		handleAlert(&alert)
	}
}

func handleAlert(alert *Alert) {
	log.Infof("Alert: %+v", alert)

	alert.Metadata.AlertManagerUrl = buildURL(alert)

	alertMap[alert.Annotations["summary"]] = alert
}

func buildURL(alert *Alert) string {
	host := os.Getenv("ALERTMANAGER_HOST")

	v := ""

	filterKeys := []string{"job", "instance"}

	for i, k := range filterKeys {
		log.Infof("k: %v   %v", k, alert.Labels[k])

		v += fmt.Sprintf("%v=\"%v\"", k, alert.Labels[k])
		v = strings.ReplaceAll(v, "=", "%3D")

		if i != len(filterKeys)-1 {
			v += "%2C "
		}
	}

	return fmt.Sprintf("http://%v/#/alerts?filter={%v}", host, v)
}

func getAllAlerts() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(alertMap)
	}
}

func getListenAddress() string {
	port := os.Getenv("PORT")

	if port == "" {
		port = "8082"
	}

	addr := ":" + port

	log.Infof("Listening on %v", addr)

	return addr
}

func main() {
	log.Infof("uncomplicated-alert-receiver")

	http.HandleFunc("/alerts", receiveWebhook)
	http.HandleFunc("/alert_list", getAllAlerts())
	http.Handle("/", http.FileServer(http.Dir("./webui")))

	log.Fatal(http.ListenAndServe(getListenAddress(), nil))
}
