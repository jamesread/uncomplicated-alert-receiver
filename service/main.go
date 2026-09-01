package main

import (
	"encoding/json"
	"net/http"
	"os"
	"time"

	log "github.com/sirupsen/logrus"

	"github.com/jamesread/uncomplicated-alert-receiver/internal/buildinfo"
	"github.com/jamesread/uncomplicated-alert-receiver/internal/receiver"
	"github.com/jamesread/uncomplicated-alert-receiver/internal/runtimeconfig"
)

func getListenAddress() string {
	port := os.Getenv("PORT")

	if port == "" {
		port = "8080"
	}

	addr := ":" + port

	log.Infof("Listening on %v", addr)

	return addr
}

type Settings struct {
	Version        string
	SeverityLabels map[string]int
	IgnoredLabels  []string
	DrawLabels     bool
}

func getSettings(w http.ResponseWriter, req *http.Request) {
	receiver.SetCORSOrigin(w)

	config := runtimeconfig.Get()

	ret := Settings{
		Version:        buildinfo.Version,
		DrawLabels:     os.Getenv("DRAW_LABELS") != "",
		SeverityLabels: config.SeverityLabels,
		IgnoredLabels:  config.IgnoredLabels,
	}

	log.Infof("Settings: %+v", ret)

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(ret); err != nil {
		log.Errorf("Encode settings response: %v", err)
	}
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

	mux := http.NewServeMux()
	mux.HandleFunc("/api/settings", getSettings)
	mux.HandleFunc("/api/alert_list", receiver.GetAllAlerts)
	mux.HandleFunc("/alerts", receiver.ReceiveWebhook)
	mux.Handle("/", http.FileServer(http.Dir(webUiDir)))

	receiver.StartDemo()

	srv := &http.Server{
		Addr:              getListenAddress(),
		Handler:           mux,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      60 * time.Second,
	}

	log.Fatal(srv.ListenAndServe())
}
