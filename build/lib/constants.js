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
var constants_exports = {};
__export(constants_exports, {
  DEVICE_TYPE_CONTROLLER: () => DEVICE_TYPE_CONTROLLER,
  DEVICE_TYPE_GATEWAY: () => DEVICE_TYPE_GATEWAY,
  DEVICE_TYPE_HUB_DEVICE: () => DEVICE_TYPE_HUB_DEVICE,
  DEVICE_TYPE_HUB_TIMER: () => DEVICE_TYPE_HUB_TIMER,
  DEVICE_TYPE_IRRIGATION: () => DEVICE_TYPE_IRRIGATION,
  DEVICE_TYPE_SENSOR: () => DEVICE_TYPE_SENSOR,
  DEVICE_TYPE_VALVE: () => DEVICE_TYPE_VALVE,
  DEVICE_TYPE_WATER_STATION: () => DEVICE_TYPE_WATER_STATION,
  SOCKET_PRODUCT_IDS: () => SOCKET_PRODUCT_IDS
});
module.exports = __toCommonJS(constants_exports);
const DEVICE_TYPE_CONTROLLER = "HCC";
const DEVICE_TYPE_SENSOR = "HCS";
const DEVICE_TYPE_VALVE = "HTV";
const DEVICE_TYPE_GATEWAY = "HWG";
const DEVICE_TYPE_WATER_STATION = "HWS";
const DEVICE_TYPE_IRRIGATION = "HIS";
const DEVICE_TYPE_HUB_DEVICE = "HIC";
const DEVICE_TYPE_HUB_TIMER = "HTP";
const SOCKET_PRODUCT_IDS = /* @__PURE__ */ new Set(["upavlp996ferbht7"]);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DEVICE_TYPE_CONTROLLER,
  DEVICE_TYPE_GATEWAY,
  DEVICE_TYPE_HUB_DEVICE,
  DEVICE_TYPE_HUB_TIMER,
  DEVICE_TYPE_IRRIGATION,
  DEVICE_TYPE_SENSOR,
  DEVICE_TYPE_VALVE,
  DEVICE_TYPE_WATER_STATION,
  SOCKET_PRODUCT_IDS
});
//# sourceMappingURL=constants.js.map
