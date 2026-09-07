# ioBroker.rainpoint-ty

Unoffizieller ioBroker-Adapter für **RainPoint-TY** (Tuya-App, T-Serie).

Dieser Adapter spricht die RainPoint-TY-Cloud (`*.baldrgroup.net`), nicht HomGar / RainPoint Home. Für H-Serie und die App **RainPoint** (ohne TY) den Adapter `iobroker.rainpoint` verwenden.

> Nicht von RainPoint oder Tuya.

## Features

- Login bei der RainPoint-TY-Cloud (EU/Amerika)
- Home- und Geräteerkennung (Gateway-Subgeräte)
- Ventile pro Zone ein/aus, Laufzeit 1–60 Minuten
- Status-Polling (online, Zone an/aus, Restzeit, letzter Wasserverbrauch, Batterie, Arbeitszustand)

**Nicht unterstützt:** RainPoint Home / HomGar (H-Serie). WLAN-Steckdosen am Gateway werden ignoriert.

## Voraussetzungen

- ioBroker mit js-controller 5 oder neuer
- Node.js 20 oder neuer
- Konto der **RainPoint-TY**-App
- Freigabe: Extra-Konto als Mitglied mit Steuerrecht, oder dasselbe Konto (dann wird die App abgemeldet)

## Installation

```bash
iobroker url https://github.com/Kuebi7/ioBroker.rainpoint-ty/tarball/main
iobroker add rainpoint-ty
```

Konfiguration: E-Mail und Passwort des TY-Kontos, Ländervorwahl (z. B. `43`), Region `EU`, Home-Index `0` für das erste/geteilte Home.

## States

```
rainpoint-ty.0.info.connection
rainpoint-ty.0.devices.<ventil>.battery
rainpoint-ty.0.devices.<ventil>.batteryState
rainpoint-ty.0.devices.<ventil>.zones.1.on
rainpoint-ty.0.devices.<ventil>.zones.1.duration
rainpoint-ty.0.devices.<ventil>.zones.1.remaining
rainpoint-ty.0.devices.<ventil>.zones.1.lastWaterUsage
rainpoint-ty.0.devices.<ventil>.zones.1.workStatus
rainpoint-ty.0.devices.<ventil>.zones.1.workStatusText
```

`lastWaterUsage` ist der letzte Durchlauf in Litern (eingebauter Durchflussmesser). `battery` ist 10/50/100 % aus der Geräte-Enum, `batteryState` ist `low`/`medium`/`high`. `workStatus` ist 0=Bereit, 1=Manuell, 2=Automatik, 3=Regenverzögerung.

## Entwicklung

```bash
npm install
npm run build
npm test
```

Der Cloud-Client basiert auf der TY-Implementierung von [homebridge-rainpoint](https://github.com/lukezbihlyj/homebridge-rainpoint) (Apache-2.0).

## Changelog


### **WORK IN PROGRESS**
- (ioBroker-Bot) Adapter requires admin >= 7.8.23 now.

### 0.1.1

- Letzter Wasserverbrauch, Batteriezustand und Arbeitszustand

### 0.1.0

- Erstes Release: TY-Login, Geräte im Home, Ventil ein/aus

## Lizenz

MIT © Andreas
