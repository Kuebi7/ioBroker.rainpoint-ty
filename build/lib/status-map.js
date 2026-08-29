"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var status_map_exports = {};
__export(status_map_exports, {
  WORK_STATUS_STATES: () => WORK_STATUS_STATES,
  dpValue: () => dpValue,
  mapBattery: () => mapBattery,
  mapWorkStatus: () => mapWorkStatus,
  parseNumberDp: () => parseNumberDp
});
module.exports = __toCommonJS(status_map_exports);
const WORK_STATUS_TEXT = {
  0: "idle",
  1: "manual",
  2: "auto",
  3: "rain_delay"
};
const BATTERY_PERCENT = {
  0: 10,
  1: 50,
  2: 100
};
const BATTERY_TEXT = {
  0: "low",
  1: "medium",
  2: "high"
};
const WORK_STATUS_STATES = {
  0: "idle",
  1: "manual",
  2: "auto",
  3: "rain_delay"
};
function parseNumberDp(value) {
  if (value === void 0 || value === null || value === "") {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function mapWorkStatus(value) {
  var _a;
  const code = parseNumberDp(value);
  if (code === null) {
    return { code: null, text: "unknown", isOn: false };
  }
  return {
    code,
    text: (_a = WORK_STATUS_TEXT[code]) != null ? _a : "unknown",
    isOn: code === 1 || code === 2
  };
}
function mapBattery(value) {
  var _a, _b;
  const level = parseNumberDp(value);
  if (level === null) {
    return { percent: null, text: null };
  }
  if (level > 2) {
    const percent = Math.min(100, Math.max(0, Math.round(level)));
    return {
      percent,
      text: percent <= 20 ? "low" : percent <= 60 ? "medium" : "high"
    };
  }
  return {
    percent: (_a = BATTERY_PERCENT[level]) != null ? _a : null,
    text: (_b = BATTERY_TEXT[level]) != null ? _b : null
  };
}
function dpValue(dps, ...keys) {
  for (const key of keys) {
    if (key === void 0 || key === "" || key === 0) {
      continue;
    }
    const value = dps.get(String(key));
    if (value !== void 0) {
      return value;
    }
  }
  return void 0;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  WORK_STATUS_STATES,
  dpValue,
  mapBattery,
  mapWorkStatus,
  parseNumberDp
});
//# sourceMappingURL=status-map.js.map
