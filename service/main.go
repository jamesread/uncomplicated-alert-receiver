package main

import (
	"encoding/json"
	log "github.com/sirupsen/logrus"
	"net/http"
	"os"

	"github.com/jamesread/uncomplicated-alert-receiver/internal/buildinfo"
	"github.com/jamesread/uncomplicated-alert-receiver/internal/receiver"
	"github.com/jamesread/uncomplicated-alert-receiver/internal/runtimeconfig"
)

func getListenAddress() string {
	port := os.Getenv("PORT")

	if port == "" {
		port = "8082"
	}

	addr := ":" + port

	log.Infof("Listening on %v", addr)

	return addr
}

type Settings struct {
	Version        string
	DrawLabels     bool
	SeverityLabels map[string]int
	IgnoredLabels  []string
}

func getSettings(w http.ResponseWriter, req *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")

	config := runtimeconfig.Get()

	ret := Settings{
		Version:        buildinfo.Version,
		DrawLabels:     os.Getenv("DRAW_LABELS") != "",
		SeverityLabels: config.SeverityLabels,
		IgnoredLabels:  config.IgnoredLabels,
	}

	log.Infof("Settings: %+v", ret)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ret)
}

func findWebuiDir() string {
	directories := []string{
		"./webui",
		"./frontend",
		"../frontend/",
	}

	for _, dir := range directories {
		if _, err := os.Stat(dir); !os.IsNotExist(err) {
			return dir
		}
	}

	return "webui-not-found/"
}

func main() {
	log.Infof("uncomplicated-alert-receiver")
	log.WithFields(log.Fields{
		"version": buildinfo.Version,
		"commit":  buildinfo.Commit,
		"date":    buildinfo.BuildDate,
	}).Infof("buildinfo")

	webUiDir := findWebuiDir()

	log.Infof("WebUI dir: %v", webUiDir)

	http.HandleFunc("/api/settings", getSettings)
	http.HandleFunc("/api/alert_list", receiver.GetAllAlerts)
	http.HandleFunc("/alerts", receiver.ReceiveWebhook)
	http.Handle("/", http.FileServer(http.Dir(webUiDir)))

	log.Fatal(http.ListenAndServe(getListenAddress(), nil))
}
