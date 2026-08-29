import { SOCKET_PRODUCT_IDS } from './constants';

export function sanitizeId(value: string): string {
    const cleaned = value.replace(/[^a-zA-Z0-9_-]/g, '_');
    return cleaned || 'device';
}

export function isIrrigationDevice(deviceType: string, name: string, productId: string): boolean {
    if (SOCKET_PRODUCT_IDS.has(productId) || /socket/i.test(name)) {
        return false;
    }
    return deviceType === 'HTV' || deviceType === 'HIS' || deviceType === 'HCC';
}
