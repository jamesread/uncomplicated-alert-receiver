# uncomplicated-alert-receiver (UAR)
<p align = "center">
<img src = "var/logo.png" width = "128px" />
</p>

A robust and reliable Prometheus alert receiver intended for heads up displays. It works without internet access, has no external dependencies, no configuration files, no storage needs, and generally has very few things to go wrong - all it does it receives alerts, and displays them in a simple webpage.

It is designed to supplement other alert receivers, which typically are used for sending notifications, such as email, slack, pagerduty, etc. It is not a replacement for those services, but a supplement to them.

### Why, what problem does this solve?

For years, I tried to create better and better Grafana dashboards on my heads up displays, cycling dashboards, showing pretty pictures and graphs. I agonized over making dashboards that displayed the right information at the right time, but something was missing. The problem was the noise, I was being shown all this information constantly as pretty graphs and visualizations, but Grafana has no idea if something is actually wrong - it's fundamentally just a pretty way to display data. What I was missing, was alerts from Prometheus when something was wrong, and then I would use Grafana to explore the information and try to figure out why. Now I have alerts on my heads up displays, and Grafana's role is on my desktop browser to explore the data, not on my heads up displays.

Additionally, this project is designed to be extremely robust, and reliable, and simple. It does one job (hopefully well). For day to day usage, or just referred to in emergencies, it should "just work".

## Installation

UAR is distributed as a Linux container, it can run on any host port, in the example below the port is 1337;

```
docker run -p 1337:8080 --name uar ghcr.io/jamesread/uncomplicated-alert-receiver
```

## Setup 

You should already have a prometheus running, as well as an alertmanager running, with at least one alert configured.

Simply, edit your alertmanager.yml to add UAR as a webhook_config. Here is an example, assuming UAR is running at yourServer:8080;

```yaml
receivers:
  - name: uar
    webhook_configs:
      - url: http://yourServer:8080/alerts
        send_resolved: false

route:
  receiver: uar
  repeat_interval: 30s
  group_interval: 30s
```

Of course you are free to set the sending intervals to a duration that fits you. 

## **This is a No-Nonsense Open Source project;**

- All code and assets are Open Source (AGPL).
- No company is paying for development, there is no paid-for support from the developers.
- No separate core and premium version, no plus/pro version or paid-for extra features.
- No SaaS service or "special cloud version".
- No "anonymous data collection", usage tracking, user tracking, telemetry or email address collection.
- No requests for reviews in any "app store" or feedback surveys.
- No prompts to "upgrade to the latest version".
- No internet-connection required for any functionality.
