# uncomplicated-alert-receiver (UAR)

A robust and reliable prometheus alert receiver intended for heads up displays. It works without internet access, external dependencies, configuration files, storage, and generally has very few things to go wrong.

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
