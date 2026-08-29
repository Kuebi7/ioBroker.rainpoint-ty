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
var devices_exports = {};
__export(devices_exports, {
  isIrrigationDevice: () => isIrrigationDevice,
  sanitizeId: () => sanitizeId
});
module.exports = __toCommonJS(devices_exports);
var import_constants = require("./constants");
function sanitizeId(value) {
  const cleaned = value.replace(/[^a-zA-Z0-9_-]/g, "_");
  return cleaned || "device";
}
function isIrrigationDevice(deviceType, name, productId) {
  if (import_constants.SOCKET_PRODUCT_IDS.has(productId) || /socket/i.test(name)) {
    return false;
  }
  return deviceType === "HTV" || deviceType === "HIS" || deviceType === "HCC";
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  isIrrigationDevice,
  sanitizeId
});
//# sourceMappingURL=devices.js.map
