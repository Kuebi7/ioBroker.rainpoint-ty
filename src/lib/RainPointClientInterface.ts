export interface Logger {
    silly(message: string, ...args: unknown[]): void;
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
}

export interface RainPointClientConfig {
    email: string;
    password: string;
    region: string;
    countryCode?: string;
    storageDir?: string;
}

export interface NormalizedZoneDps {
    workStatus: number;
    manualTimer: number;
    manualSwitch: number;
    remainTime: number;
}

export interface NormalizedDevice {
    id: string;
    name: string;
    model: string;
    productId: string;
    deviceName: string;
    online: boolean;
    portNumber: number;
    portDescribe: string[];
    deviceType: string;
    isSubDevice: boolean;
    parentId?: string;
    addr: number;
    nodeId?: string;
    zoneSwitchDps?: number[];
    zoneDps?: NormalizedZoneDps[];
}

export interface NormalizedZoneStatus {
    port: number;
    name: string;
    isOn: boolean;
    remainingDuration: number;
}

export interface NormalizedDeviceStatus {
    deviceId: string;
    online: boolean;
    zones: NormalizedZoneStatus[];
    moisture: number | null;
    temperature: number | null;
    battery: number | null;
}

export interface NormalizedHome {
    id: string;
    name: string;
}

export interface RainPointClient {
    login(): Promise<void>;
    ensureAuthenticated(): Promise<void>;
    getHomes(): Promise<NormalizedHome[]>;
    setHome(homeId: string): void;
    getDevices(): Promise<NormalizedDevice[]>;
    getDeviceStatuses(deviceIds: string[]): Promise<Map<string, NormalizedDeviceStatus>>;
    turnZoneOn(deviceId: string, port: number, durationSeconds?: number): Promise<void>;
    turnZoneOff(deviceId: string, port: number): Promise<void>;
}
