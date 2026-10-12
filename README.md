# ioBroker.rainpoint-ty

Unofficial ioBroker adapter for **RainPoint-TY** (Tuya app, T-series).

This adapter talks to the RainPoint-TY cloud (`*.baldrgroup.net`), not HomGar / RainPoint Home. Use `iobroker.rainpoint` for H-series devices and the **RainPoint** app (without TY).

> Not affiliated with RainPoint or Tuya.

## Features

- Login to the RainPoint-TY cloud (EU / America)
- Home and device discovery (gateway sub-devices)
- Per-zone valve on/off, runtime 1-60 minutes
- Status polling (online, zone on/off, remaining time, last water usage, battery, work status)

**Not supported:** RainPoint Home / HomGar (H-series). Wi-Fi sockets on the gateway are ignored.

## Prerequisites

- ioBroker with js-controller 6 or newer
- Node.js 22 or newer
- A **RainPoint-TY** app account
- Recommended: a dedicated member account with control rights, so the phone app stays logged in

## Configuration

Set the TY account email and password, country calling code (for example `43`), region `EU`, and home index `0` for the first or shared home.

RainPoint-TY allows only one cloud session per account. Using the same account as the phone app will log the app out.

## States

```
rainpoint-ty.0.info.connection
rainpoint-ty.0.devices.<valve>.battery
rainpoint-ty.0.devices.<valve>.batteryState
rainpoint-ty.0.devices.<valve>.zones.1.on
rainpoint-ty.0.devices.<valve>.zones.1.duration
rainpoint-ty.0.devices.<valve>.zones.1.remaining
rainpoint-ty.0.devices.<valve>.zones.1.lastWaterUsage
rainpoint-ty.0.devices.<valve>.zones.1.workStatus
rainpoint-ty.0.devices.<valve>.zones.1.workStatusText
```

`lastWaterUsage` is the last run in liters (built-in flow meter). `battery` is 10/50/100 % from the device enum, `batteryState` is `low` / `medium` / `high`. `workStatus` is 0=idle, 1=manual, 2=auto, 3=rain delay.

## Changelog

### 0.1.3

- Follow-up repository checker fixes (release-script, CI, maintainer email)

### 0.1.2

- Repository checker fixes (Node.js 22, current dependencies, i18n, CI)

### 0.1.1

- Last water usage, battery level and work status

### 0.1.0

- Initial release: TY login, devices in the home, valve on/off

Older changelogs are in [CHANGELOG_OLD.md](CHANGELOG_OLD.md).

## License

MIT License

Copyright (c) 2026 Andreas <Kuebi7@users.noreply.github.com>

See the [LICENSE](./LICENSE) file.

The cloud client is based on the TY implementation of [homebridge-rainpoint](https://github.com/lukezbihlyj/homebridge-rainpoint) (Apache-2.0).
