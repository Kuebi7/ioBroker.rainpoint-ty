import { format } from 'node:util';
import * as utils from '@iobroker/adapter-core';
import { sanitizeId } from './lib/devices';
import { WORK_STATUS_STATES } from './lib/status-map';
import { RainPointTyClient } from './lib/ty-client';
import type { Logger, NormalizedDevice, NormalizedDeviceStatus } from './lib/RainPointClientInterface';

function wrapLog(log: ioBroker.Logger): Logger {
    const emit =
        (fn: (msg: string) => void) =>
        (message: string, ...args: unknown[]): void => {
            fn(args.length ? format(message, ...args) : message);
        };
    return {
        silly: emit(msg => log.silly(msg)),
        debug: emit(msg => log.debug(msg)),
        info: emit(msg => log.info(msg)),
        warn: emit(msg => log.warn(msg)),
        error: emit(msg => log.error(msg)),
    };
}

interface ZoneTarget {
    deviceId: string;
    port: number;
    prefix: string;
}

class RainpointTy extends utils.Adapter {
    private client?: RainPointTyClient;
    private pollTimer?: ioBroker.Timeout;
    private remainingTimer?: ioBroker.Timeout;
    private readonly devices = new Map<string, NormalizedDevice>();
    private readonly zoneTargets = new Map<string, ZoneTarget>();
    private commandInFlight = false;
    private unloading = false;
    private statesSubscribed = false;

    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: 'rainpoint-ty',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    private async onReady(): Promise<void> {
        await this.setState('info.connection', false, true);
        if (!this.config.email || !this.config.password) {
            this.log.error('Please set email and password in the adapter configuration');
            return;
        }
        this.log.warn(
            'RainPoint-TY allows only one cloud session per account. Use a dedicated member account so the phone app stays logged in.',
        );
        this.client = new RainPointTyClient(
            {
                email: this.config.email,
                password: this.config.password,
                countryCode: String(this.config.countryCode || '43'),
                region: String(this.config.region || 'EU'),
            },
            wrapLog(this.log),
        );
        await this.connect();
    }

    private async ensureInfoStates(): Promise<void> {
        await this.extendObjectAsync('info.homeId', {
            type: 'state',
            common: { name: 'Home ID', type: 'string', role: 'text', read: true, write: false },
            native: {},
        });
        await this.extendObjectAsync('info.homeName', {
            type: 'state',
            common: { name: 'Home name', type: 'string', role: 'text', read: true, write: false },
            native: {},
        });
        await this.extendObjectAsync('info.lastUpdate', {
            type: 'state',
            common: {
                name: 'Last successful cloud update',
                type: 'number',
                role: 'value.time',
                read: true,
                write: false,
            },
            native: {},
        });
        await this.extendObjectAsync('info.lastError', {
            type: 'state',
            common: { name: 'Last error', type: 'string', role: 'text', read: true, write: false },
            native: {},
        });
    }

    private async connect(): Promise<void> {
        if (!this.client) {
            return;
        }
        try {
            await this.client.login();
            const homes = await this.client.getHomes();
            if (!homes.length) {
                throw new Error('No homes found for this account');
            }
            const home = homes[Math.min(Math.max(this.config.homeIndex || 0, 0), homes.length - 1)];
            this.client.setHome(home.id);
            this.log.info(`Using home "${home.name}" (${home.id})`);
            await this.ensureInfoStates();
            await this.setStateAsync('info.homeId', { val: home.id, ack: true });
            await this.setStateAsync('info.homeName', { val: home.name, ack: true });
            await this.setState('info.connection', true, true);
            await this.poll();
            this.schedulePoll();
            this.scheduleRemainingCountdown();
            if (!this.statesSubscribed) {
                this.subscribeStates('devices.*');
                this.statesSubscribed = true;
            }
        } catch (error) {
            const message = (error as Error).message;
            this.log.error(`Startup failed: ${message}`);
            await this.setState('info.connection', false, true);
            await this.ensureInfoStates();
            await this.setState('info.lastError', message, true);
            this.log.info('Retrying login in 60 seconds');
            this.scheduleReconnect(60);
        }
    }

    private scheduleReconnect(delaySeconds: number): void {
        if (this.pollTimer) {
            this.clearTimeout(this.pollTimer);
        }
        this.pollTimer = this.setTimeout(() => {
            void this.connect();
        }, delaySeconds * 1000);
    }

    private schedulePoll(delaySeconds?: number): void {
        if (this.pollTimer) {
            this.clearTimeout(this.pollTimer);
        }
        const seconds = delaySeconds ?? Math.max(this.config.pollInterval || 60, 30);
        this.pollTimer = this.setTimeout(() => {
            void this.poll()
                .then(() => {
                    if (!this.unloading) {
                        this.schedulePoll();
                    }
                })
                .catch(error => {
                    this.log.error(`Poll failed: ${(error as Error).message}`);
                    if (!this.unloading) {
                        this.schedulePoll();
                    }
                });
        }, seconds * 1000);
    }

    private scheduleRemainingCountdown(): void {
        if (this.remainingTimer) {
            this.clearTimeout(this.remainingTimer);
        }
        this.remainingTimer = this.setTimeout(() => {
            void this.tickRemaining().finally(() => {
                if (!this.unloading) {
                    this.scheduleRemainingCountdown();
                }
            });
        }, 1000);
    }

    private async tickRemaining(): Promise<void> {
        for (const target of this.zoneTargets.values()) {
            const remainingId = `${target.prefix}.remaining`;
            const onId = `${target.prefix}.on`;
            const remainingState = await this.getStateAsync(remainingId);
            if (typeof remainingState?.val !== 'number' || remainingState.val <= 0) {
                continue;
            }
            const next = remainingState.val - 1;
            await this.setState(remainingId, next, true);
            if (next <= 0) {
                await this.setState(onId, false, true);
            }
        }
    }

    private async poll(): Promise<void> {
        if (!this.client || this.commandInFlight) {
            return;
        }
        try {
            const devices = await this.client.getDevices();
            this.devices.clear();
            for (const device of devices) {
                this.devices.set(device.id, device);
                await this.syncDeviceObjects(device);
            }
            const statuses = await this.client.getDeviceStatuses([...this.devices.keys()]);
            for (const [id, status] of statuses) {
                await this.applyStatus(id, status);
            }
            await this.setState('info.connection', true, true);
            await this.setState('info.lastUpdate', Date.now(), true);
            await this.setState('info.lastError', '', true);
        } catch (error) {
            await this.setState('info.connection', false, true);
            await this.setState('info.lastError', (error as Error).message, true);
            throw error;
        }
    }

    private async syncDeviceObjects(device: NormalizedDevice): Promise<void> {
        const prefix = `devices.${sanitizeId(device.id)}`;
        await this.extendObjectAsync(prefix, {
            type: 'device',
            common: { name: device.name },
            native: { id: device.id, productId: device.productId, kind: device.deviceType },
        });
        await this.setStateValue(`${prefix}.name`, device.name, 'text', 'Name');
        await this.setStateValue(`${prefix}.model`, device.model, 'text', 'Model');
        await this.setStateValue(`${prefix}.online`, device.online, 'indicator.reachable', 'Online', 'boolean');
        await this.extendObjectAsync(`${prefix}.battery`, {
            type: 'state',
            common: {
                name: 'Battery',
                type: 'number',
                role: 'value.battery',
                read: true,
                write: false,
                unit: '%',
                min: 0,
                max: 100,
            },
            native: {},
        });
        await this.extendObjectAsync(`${prefix}.batteryState`, {
            type: 'state',
            common: {
                name: 'Batteriezustand',
                type: 'string',
                role: 'text',
                read: true,
                write: false,
                states: { low: 'low', medium: 'medium', high: 'high' },
            },
            native: {},
        });
        await this.extendObjectAsync(`${prefix}.zones`, {
            type: 'channel',
            common: { name: 'Zones' },
            native: {},
        });
        for (let port = 1; port <= Math.max(device.portNumber, 1); port++) {
            await this.syncZoneObjects(device, prefix, port);
        }
    }

    private async syncZoneObjects(device: NormalizedDevice, devicePrefix: string, port: number): Promise<void> {
        const prefix = `${devicePrefix}.zones.${port}`;
        const zoneName = device.portDescribe[port - 1] ?? `Zone ${port}`;
        await this.extendObjectAsync(prefix, {
            type: 'channel',
            common: { name: zoneName },
            native: { deviceId: device.id, port },
        });
        await this.setStateValue(`${prefix}.name`, zoneName, 'text', 'Zone name');
        await this.extendObjectAsync(`${prefix}.on`, {
            type: 'state',
            common: {
                name: `${zoneName} on`,
                type: 'boolean',
                role: 'switch',
                read: true,
                write: true,
                def: false,
            },
            native: { deviceId: device.id, port },
        });
        await this.extendObjectAsync(`${prefix}.duration`, {
            type: 'state',
            common: {
                name: `${zoneName} duration`,
                type: 'number',
                role: 'value',
                read: true,
                write: true,
                unit: 'min',
                min: 1,
                max: 60,
                def: this.config.defaultDuration || 10,
            },
            native: { deviceId: device.id, port },
        });
        await this.extendObjectAsync(`${prefix}.remaining`, {
            type: 'state',
            common: {
                name: `${zoneName} remaining`,
                type: 'number',
                role: 'value.interval',
                read: true,
                write: false,
                unit: 's',
                def: 0,
            },
            native: {},
        });
        await this.extendObjectAsync(`${prefix}.lastWaterUsage`, {
            type: 'state',
            common: {
                name: `${zoneName} letzter Wasserverbrauch`,
                type: 'number',
                role: 'value',
                read: true,
                write: false,
                unit: 'l',
            },
            native: {},
        });
        await this.extendObjectAsync(`${prefix}.workStatus`, {
            type: 'state',
            common: {
                name: `${zoneName} Arbeitszustand`,
                type: 'number',
                role: 'value',
                read: true,
                write: false,
                states: WORK_STATUS_STATES,
            },
            native: {},
        });
        await this.extendObjectAsync(`${prefix}.workStatusText`, {
            type: 'state',
            common: {
                name: `${zoneName} Arbeitszustand Text`,
                type: 'string',
                role: 'text',
                read: true,
                write: false,
                states: {
                    idle: 'Bereit',
                    manual: 'Manuell',
                    auto: 'Automatik',
                    rain_delay: 'Regenverzögerung',
                    unknown: 'Unbekannt',
                },
            },
            native: {},
        });
        this.zoneTargets.set(`${this.namespace}.${prefix}.on`, { deviceId: device.id, port, prefix });
        const durationState = await this.getStateAsync(`${prefix}.duration`);
        if (durationState?.val == null) {
            await this.setState(`${prefix}.duration`, this.config.defaultDuration || 10, true);
        }
    }

    private async applyStatus(deviceId: string, status: NormalizedDeviceStatus): Promise<void> {
        const device = this.devices.get(deviceId);
        if (!device) {
            return;
        }
        const prefix = `devices.${sanitizeId(deviceId)}`;
        await this.setState(`${prefix}.online`, status.online, true);
        if (status.battery !== null) {
            await this.setState(`${prefix}.battery`, status.battery, true);
        }
        if (status.batteryState !== null) {
            await this.setState(`${prefix}.batteryState`, status.batteryState, true);
        }
        if (status.moisture !== null) {
            await this.setStateValue(
                `${prefix}.moisture`,
                status.moisture,
                'value.moisture',
                'Soil moisture',
                'number',
                '%',
            );
        }
        if (status.temperature !== null) {
            await this.setStateValue(
                `${prefix}.temperature`,
                status.temperature,
                'value.temperature',
                'Temperature',
                'number',
                '°C',
            );
        }
        for (const zone of status.zones) {
            const zonePrefix = `${prefix}.zones.${zone.port}`;
            await this.setState(`${zonePrefix}.on`, zone.isOn, true);
            await this.setState(`${zonePrefix}.remaining`, zone.remainingDuration, true);
            await this.setState(`${zonePrefix}.name`, zone.name, true);
            await this.setState(`${zonePrefix}.lastWaterUsage`, zone.lastWaterUsage, true);
            await this.setState(`${zonePrefix}.workStatus`, zone.workStatus, true);
            await this.setState(`${zonePrefix}.workStatusText`, zone.workStatusText, true);
        }
    }

    private async setStateValue(
        id: string,
        value: ioBroker.StateValue,
        role: string,
        name: string,
        type: ioBroker.CommonType = 'string',
        unit?: string,
    ): Promise<void> {
        await this.extendObjectAsync(id, {
            type: 'state',
            common: {
                name,
                type,
                role,
                read: true,
                write: false,
                ...(unit ? { unit } : {}),
            },
            native: {},
        });
        await this.setState(id, value, true);
    }

    private async onStateChange(id: string, state: ioBroker.State | null | undefined): Promise<void> {
        if (!state || state.ack || !this.client) {
            return;
        }
        const target = this.zoneTargets.get(id);
        if (!target) {
            if (id.endsWith('.duration')) {
                await this.setState(id, state.val, true);
            }
            return;
        }
        if (typeof state.val !== 'boolean') {
            return;
        }
        this.commandInFlight = true;
        try {
            if (state.val) {
                const durationState = await this.getStateAsync(`${target.prefix}.duration`);
                const minutes =
                    typeof durationState?.val === 'number' && durationState.val > 0
                        ? durationState.val
                        : this.config.defaultDuration || 10;
                const seconds = Math.round(minutes * 60);
                this.log.info(`Opening ${target.deviceId} zone ${target.port} for ${minutes} min`);
                await this.client.turnZoneOn(target.deviceId, target.port, seconds);
                await this.setState(`${target.prefix}.on`, true, true);
                await this.setState(`${target.prefix}.remaining`, seconds, true);
            } else {
                this.log.info(`Closing ${target.deviceId} zone ${target.port}`);
                await this.client.turnZoneOff(target.deviceId, target.port);
                await this.setState(`${target.prefix}.on`, false, true);
                await this.setState(`${target.prefix}.remaining`, 0, true);
            }
        } catch (error) {
            this.log.error(`Valve command failed: ${(error as Error).message}`);
            await this.setState('info.lastError', (error as Error).message, true);
            await this.setState(`${target.prefix}.on`, !state.val, true);
        } finally {
            this.commandInFlight = false;
        }
    }

    private onUnload(callback: () => void): void {
        this.unloading = true;
        try {
            if (this.pollTimer) {
                this.clearTimeout(this.pollTimer);
            }
            if (this.remainingTimer) {
                this.clearTimeout(this.remainingTimer);
            }
            void this.setState('info.connection', false, true);
            callback();
        } catch {
            callback();
        }
    }
}

if (require.main !== module) {
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new RainpointTy(options);
} else {
    (() => new RainpointTy())();
}
