/// <reference types="mocha" />
import { expect } from 'chai';
import { isIrrigationDevice, sanitizeId } from './devices';

describe('devices', () => {
    it('sanitizes ids and skips sockets', () => {
        expect(sanitizeId('bf/xx')).to.equal('bf_xx');
        expect(isIrrigationDevice('HTV', 'WiFi Ventil', 'ew946yrp3pgbaziu')).to.equal(true);
        expect(isIrrigationDevice('HTV', 'wifi Socket', 'upavlp996ferbht7')).to.equal(false);
    });
});
