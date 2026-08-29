/// <reference types="mocha" />
import { expect } from 'chai';
import { dpValue, mapBattery, mapWorkStatus, parseNumberDp } from './status-map';

describe('status-map', () => {
    it('maps work status including auto as running', () => {
        expect(mapWorkStatus('0')).to.deep.equal({ code: 0, text: 'idle', isOn: false });
        expect(mapWorkStatus(1)).to.deep.equal({ code: 1, text: 'manual', isOn: true });
        expect(mapWorkStatus('2')).to.deep.equal({ code: 2, text: 'auto', isOn: true });
        expect(mapWorkStatus(3)).to.deep.equal({ code: 3, text: 'rain_delay', isOn: false });
        expect(mapWorkStatus(undefined)).to.deep.equal({ code: null, text: 'unknown', isOn: false });
    });

    it('maps battery enum 0-2 to percent', () => {
        expect(mapBattery('0')).to.deep.equal({ percent: 10, text: 'low' });
        expect(mapBattery(1)).to.deep.equal({ percent: 50, text: 'medium' });
        expect(mapBattery('2')).to.deep.equal({ percent: 100, text: 'high' });
        expect(mapBattery(87)).to.deep.equal({ percent: 87, text: 'high' });
        expect(mapBattery(null)).to.deep.equal({ percent: null, text: null });
    });

    it('reads numeric DPs and skips empty keys', () => {
        const dps = new Map<string, unknown>([
            ['103', 12],
            ['105', '2'],
        ]);
        expect(parseNumberDp(dpValue(dps, 103))).to.equal(12);
        expect(dpValue(dps, 0, undefined, 105)).to.equal('2');
        expect(dpValue(dps, 999)).to.equal(undefined);
    });
});
