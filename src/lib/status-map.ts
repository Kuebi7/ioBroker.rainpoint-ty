const WORK_STATUS_TEXT: Record<number, string> = {
    0: 'idle',
    1: 'manual',
    2: 'auto',
    3: 'rain_delay',
};

const BATTERY_PERCENT: Record<number, number> = {
    0: 10,
    1: 50,
    2: 100,
};

const BATTERY_TEXT: Record<number, string> = {
    0: 'low',
    1: 'medium',
    2: 'high',
};

export const WORK_STATUS_STATES: Record<string, string> = {
    0: 'idle',
    1: 'manual',
    2: 'auto',
    3: 'rain_delay',
};

export function parseNumberDp(value: unknown): number | null {
    if (value === undefined || value === null || value === '') {
        return null;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

export function mapWorkStatus(value: unknown): { code: number | null; text: string; isOn: boolean } {
    const code = parseNumberDp(value);
    if (code === null) {
        return { code: null, text: 'unknown', isOn: false };
    }
    return {
        code,
        text: WORK_STATUS_TEXT[code] ?? 'unknown',
        isOn: code === 1 || code === 2,
    };
}

export function mapBattery(value: unknown): { percent: number | null; text: string | null } {
    const level = parseNumberDp(value);
    if (level === null) {
        return { percent: null, text: null };
    }
    if (level > 2) {
        const percent = Math.min(100, Math.max(0, Math.round(level)));
        return {
            percent,
            text: percent <= 20 ? 'low' : percent <= 60 ? 'medium' : 'high',
        };
    }
    return {
        percent: BATTERY_PERCENT[level] ?? null,
        text: BATTERY_TEXT[level] ?? null,
    };
}

export function dpValue(dps: Map<string, unknown>, ...keys: Array<string | number | undefined>): unknown {
    for (const key of keys) {
        if (key === undefined || key === '' || key === 0) {
            continue;
        }
        const value = dps.get(String(key));
        if (value !== undefined) {
            return value;
        }
    }
    return undefined;
}
