"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var ty_client_exports = {};
__export(ty_client_exports, {
  RainPointTyClient: () => RainPointTyClient
});
module.exports = __toCommonJS(ty_client_exports);
var import_node_https = __toESM(require("node:https"));
var import_node_crypto = __toESM(require("node:crypto"));
var import_node_fs = __toESM(require("node:fs"));
var import_node_zlib = __toESM(require("node:zlib"));
var import_node_url = require("node:url");
var import_constants = require("./constants");
var import_status_map = require("./status-map");
const APP_KEY = "u9hs9dxd7cpcnj5ewcak";
const APP_SECRET = "5r4deyaxxdktnd4gxtn3vuatuvvgeprm";
const TTID = `sdk_international@${APP_KEY}`;
const CH_KEY = "03048afb";
const API_ET_VERSION = "3";
const API_VERSIONS = {
  // The app uses username.token.get (v2.0) with postData {countryCode, username, isUid},
  // NOT email.token.create. Verified via Frida capture6: the live app's token request
  // sends field "username" (not "email") and uses API thing.m.user.username.token.get.
  // Using the wrong endpoint returns a publicKey that the login server rejects with
  // USER_PASSWD_WRONG because the passwd was RSA-encrypted with the wrong key.
  "thing.m.user.username.token.get": "2.0",
  "thing.m.user.email.password.login": "3.0",
  // location.extend.list (v1.0) returns an object {<homeId>: {defaultHome:"0"}}, NOT an
  // array. Verified via the live app's response: {"result":{"157747002":{"defaultHome":"0"}}}.
  // The app parses it as a HashMap (FamilyExtraBusiness.smali asyncHashMap).
  "thing.m.location.extend.list": "1.0",
  // m.life.location.get (v3.4) fetches a single home's details by gid. Returns
  // HomeResponseBean with name + rooms + devices. Used to resolve home names.
  "m.life.location.get": "3.4",
  "thing.m.my.group.device.list": "2.1",
  "thing.m.device.dp.get": "1.0",
  "thing.m.device.dp.publish": "1.0",
  // thing.m.product.thing.model (v1.0) {productId, productVersion} -> canonical
  // DP schema (ThingSmartThingModel: services[] with properties{code,type,range}).
  // The authoritative per-product DP definition list — the plugin fetches this
  // once per productId to resolve each zone's WorkStatus/ManualTimer/ManualSwitch/
  // RemainTime DPs by code (instead of hardcoding offsets like 104/155, which are
  // wrong for multi-zone RainPoint products). Verified live 2026-06-20.
  "thing.m.product.thing.model": "1.0"
};
const PACKAGE_NAME = "com.baldr.rainpoint";
const CERT_SHA256_COLON = "2F:0B:FA:2B:F9:48:5B:D4:AC:29:11:EB:CE:32:D4:60:38:65:FE:9B:38:47:5F:AF:DF:E0:2C:D6:02:E3:93:B6";
const BMP_SECRET_ASCII = "sv3cc3v445yqkggja8aexmjdgeqygsvv";
const HMAC_KEY = `${PACKAGE_NAME}_${CERT_SHA256_COLON}_${BMP_SECRET_ASCII}_${APP_SECRET}`;
const REGION_ENDPOINTS = {
  EU: "https://a1-eu.baldrgroup.net/api.json",
  AZ: "https://a1-us.baldrgroup.net/api.json",
  IN: "https://a1-in.baldrgroup.net/api.json",
  RU: "https://a1.iot334.com/api.json",
  US: "https://a1-us.baldrgroup.net/api.json"
};
const DEFAULT_MQTT_PORT = 8883;
function md5(data) {
  return import_node_crypto.default.createHash("md5").update(data, "utf8").digest("hex");
}
function mobileHash(data) {
  const pre = md5(data);
  return pre.slice(8, 16) + pre.slice(0, 8) + pre.slice(24, 32) + pre.slice(16, 24);
}
function rewriteApiName(action) {
  if (action.startsWith("thing")) {
    return `@xx2@${action}`;
  }
  return action;
}
function finalizeApiName(action) {
  return rewriteApiName(action).replaceAll("@xx2@thing", "smartlife");
}
function generateDeviceId() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 44; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}
function formUrlEncode(params) {
  return Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v).replace(/%20/g, "+")}`).join("&");
}
function deriveEncryptoKey(requestId, ecode) {
  const keyString = ecode ? `${HMAC_KEY}_${ecode}` : HMAC_KEY;
  const hash = import_node_crypto.default.createHmac("sha256", requestId).update(keyString, "utf8").digest("hex");
  return Buffer.from(hash.substring(0, 16), "ascii");
}
function aesGcmEncryptBase64(key, plaintext) {
  const iv = import_node_crypto.default.randomBytes(12);
  const cipher = import_node_crypto.default.createCipheriv("aes-128-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ct, tag]).toString("base64");
}
function aesGcmDecryptBase64(key, b64) {
  const raw = Buffer.from(b64, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(raw.length - 16);
  const ct = raw.subarray(12, raw.length - 16);
  const decipher = import_node_crypto.default.createDecipheriv("aes-128-gcm", key, iv);
  decipher.setAuthTag(tag);
  let decrypted = Buffer.concat([decipher.update(ct), decipher.final()]);
  if (decrypted.length >= 2 && decrypted[0] === 31 && decrypted[1] === 139) {
    decrypted = import_node_zlib.default.gunzipSync(decrypted);
  }
  return decrypted.toString("utf8");
}
class TuyaApiError extends Error {
  code;
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}
class RainPointTyClient {
  constructor(config, log) {
    this.config = config;
    this.log = log;
    const region = config.region || "EU";
    this.region = region;
    this.endpoint = REGION_ENDPOINTS[region] || REGION_ENDPOINTS.EU;
    this.countryCode = config.countryCode || "1";
    this.deviceId = RainPointTyClient.getOrCreateDeviceId();
    if (config.storageDir) {
      const safeEmail = config.email.replace(/[^a-zA-Z0-9@._-]/g, "_");
      this.sessionFile = `${config.storageDir}/rainpoint-ty-session-${safeEmail}.json`;
      this.loadSession();
    } else {
      this.sessionFile = null;
    }
  }
  sid = "";
  ecode = "";
  uid = "";
  partnerIdentity = "";
  mqttBroker = "";
  mqttPort = 8883;
  endpoint;
  deviceId;
  countryCode;
  region;
  homeId = "";
  static deviceIdStorage = null;
  // Cache of deviceId -> NormalizedDevice, populated by getDevices(). Used by
  // turnZoneOn/Off to resolve a 1-based port number to the device's per-zone
  // switch DP (RainPoint TY uses 104/155/... rather than DP 1/2/...).
  deviceCache = /* @__PURE__ */ new Map();
  // Map of devId -> localKey for EVERY device returned by the device list
  // (gateways AND sub-devices). Used to AES-decrypt MQTT DP pushes that
  // arrive on `smart/mb/in/{devId}` as Tuya "Thing" protocol 2.2 binary
  // frames. The gateway's localKey decrypts pushes for its sub-devices.
  localKeys = /* @__PURE__ */ new Map();
  sessionFile;
  sessionRestored = false;
  /** Load a saved session from disk, if present. */
  loadSession() {
    if (!this.sessionFile) {
      return;
    }
    try {
      if (!import_node_fs.default.existsSync(this.sessionFile)) {
        return;
      }
      const raw = import_node_fs.default.readFileSync(this.sessionFile, "utf8");
      const saved = JSON.parse(raw);
      if (saved.sid) {
        this.sid = saved.sid;
        this.ecode = saved.ecode || "";
        this.uid = saved.uid || "";
        this.partnerIdentity = saved.partnerIdentity || "";
        this.mqttBroker = saved.mqttBroker || "";
        this.mqttPort = saved.mqttPort || DEFAULT_MQTT_PORT;
        if (saved.endpoint) {
          this.endpoint = saved.endpoint;
        }
        this.sessionRestored = true;
        this.log.info(
          "[TY] Restored saved session (sid=%s..., endpoint=%s)",
          this.sid.slice(0, 12),
          this.endpoint
        );
      }
    } catch (e) {
      this.log.warn("[TY] Failed to load saved session: %s", e);
    }
  }
  /** Persist the current session to disk. */
  saveSession() {
    if (!this.sessionFile) {
      return;
    }
    try {
      const data = JSON.stringify({
        sid: this.sid,
        ecode: this.ecode,
        endpoint: this.endpoint,
        uid: this.uid,
        partnerIdentity: this.partnerIdentity,
        mqttBroker: this.mqttBroker,
        mqttPort: this.mqttPort
      });
      import_node_fs.default.writeFileSync(this.sessionFile, data, "utf8");
      this.log.debug("[TY] Saved session to %s", this.sessionFile);
    } catch (e) {
      this.log.warn("[TY] Failed to save session: %s", e);
    }
  }
  /** Clear the saved session file (called when the server rejects the sid). */
  clearSession() {
    this.sid = "";
    this.ecode = "";
    this.uid = "";
    this.partnerIdentity = "";
    this.mqttBroker = "";
    this.sessionRestored = false;
    if (!this.sessionFile) {
      return;
    }
    try {
      if (import_node_fs.default.existsSync(this.sessionFile)) {
        import_node_fs.default.unlinkSync(this.sessionFile);
      }
    } catch (e) {
      this.log.warn("[TY] Failed to clear saved session: %s", e);
    }
  }
  static getOrCreateDeviceId() {
    if (RainPointTyClient.deviceIdStorage) {
      return RainPointTyClient.deviceIdStorage;
    }
    const id = generateDeviceId();
    RainPointTyClient.deviceIdStorage = id;
    return id;
  }
  async login() {
    if (this.sid) {
      this.log.debug("[TY] Session already present (sid=%s...) \u2014 skipping login", this.sid.slice(0, 12));
      return;
    }
    await this.loginEx();
  }
  async loginEx() {
    this.log.debug("[TY] Creating username token for encrypted login...");
    const tokenResult = await this.request(
      "thing.m.user.username.token.get",
      {
        countryCode: this.countryCode,
        username: this.config.email,
        isUid: false
      },
      false
    );
    this.log.debug("[TY] Token created, encrypting password with RSA...");
    const passwdMd5 = md5(this.config.password);
    const encryptedPass = this.rsaEncryptFixedPadding(tokenResult.publicKey, tokenResult.exponent, passwdMd5);
    this.log.debug("[TY] RSA-encrypted passwd (len=%d): %s", encryptedPass.length, encryptedPass);
    const result = await this.request(
      "thing.m.user.email.password.login",
      {
        countryCode: this.countryCode,
        email: this.config.email,
        passwd: encryptedPass,
        ifencrypt: 1,
        options: '{"group": 1,"mfaCode": ""}',
        token: tokenResult.token
      },
      false
    );
    this.handleLoginResult(result);
  }
  buildRsaPublicKeyDer(n, e) {
    if (n[0] & 128) {
      n = Buffer.concat([Buffer.from([0]), n]);
    }
    if (e[0] & 128) {
      e = Buffer.concat([Buffer.from([0]), e]);
    }
    const nTag = Buffer.concat([Buffer.from([2]), this.derEncodeLength(n.length), n]);
    const eTag = Buffer.concat([Buffer.from([2]), this.derEncodeLength(e.length), e]);
    const innerLen = nTag.length + eTag.length;
    return Buffer.concat([Buffer.from([48]), this.derEncodeLength(innerLen), nTag, eTag]);
  }
  derEncodeLength(len) {
    if (len < 128) {
      return Buffer.from([len]);
    }
    if (len <= 255) {
      return Buffer.from([129, len]);
    }
    return Buffer.from([130, len >> 8 & 255, len & 255]);
  }
  /**
   * RSA-encrypt the password MD5 hex with PKCS1 v1.5 padding using Tuya's
   * FixedSecureRandom — a deterministic 20-byte seed repeated to fill the
   * padding string. Tuya's server compares the ciphertext, so the padding
   * bytes must match exactly.
   *
   * @param publicKeyDecimal decimal modulus string from token.create
   * @param exponentDecimal  decimal exponent string (e.g. "3")
   * @param plaintext         the MD5 hex string (lowercase, 32 chars)
   * @returns 256-char lowercase hex ciphertext
   */
  rsaEncryptFixedPadding(publicKeyDecimal, exponentDecimal, plaintext) {
    const FIXED_SEED = Buffer.from([
      170,
      253,
      18,
      246,
      89,
      202,
      230,
      52,
      137,
      180,
      121,
      229,
      7,
      109,
      222,
      194,
      240,
      108,
      181,
      143
    ]);
    const n = BigInt(publicKeyDecimal);
    const e = BigInt(exponentDecimal || "3");
    const msg = Buffer.from(plaintext, "utf8");
    const keyBytes = n.toString(16).length + 1 >> 1;
    const psLen = keyBytes - msg.length - 3;
    const ps = Buffer.alloc(psLen);
    for (let i = 0; i < psLen; i++) {
      ps[i] = FIXED_SEED[i % FIXED_SEED.length];
    }
    const block = Buffer.concat([Buffer.from([0, 2]), ps, Buffer.from([0]), msg]);
    if (block.length !== keyBytes) {
      throw new Error(`PKCS1 block length ${block.length} != key length ${keyBytes}`);
    }
    let m = BigInt(0);
    for (let i = 0; i < block.length; i++) {
      m = m << 8n | BigInt(block[i]);
    }
    let c = 1n;
    let exp = e;
    while (exp > 0n) {
      if (exp & 1n) {
        c = c * m % n;
      }
      m = m * m % n;
      exp >>= 1n;
    }
    let hex = c.toString(16);
    if (hex.length < keyBytes * 2) {
      hex = "0".repeat(keyBytes * 2 - hex.length) + hex;
    }
    return hex;
  }
  handleLoginResult(result) {
    var _a, _b, _c;
    this.sid = result.sid;
    this.ecode = result.ecode;
    this.uid = result.uid;
    this.partnerIdentity = typeof result.partnerIdentity === "string" ? result.partnerIdentity : "";
    if ((_a = result.domain) == null ? void 0 : _a.mobileMqttsUrl) {
      this.mqttBroker = result.domain.mobileMqttsUrl;
    }
    if ((_b = result.domain) == null ? void 0 : _b.mqttsPort) {
      this.mqttPort = result.domain.mqttsPort;
    }
    if ((_c = result.domain) == null ? void 0 : _c.mobileApiUrl) {
      const newEndpoint = `${result.domain.mobileApiUrl}/api.json`;
      if (newEndpoint !== this.endpoint) {
        this.log.debug("Tuya endpoint redirected to: %s", result.domain.mobileApiUrl);
        this.endpoint = newEndpoint;
      }
    }
    this.sessionRestored = false;
    this.saveSession();
    this.log.info("Logged in to RainPoint TY API as %s", this.config.email);
    if (this.partnerIdentity) {
      this.log.debug(
        "[TY] partnerIdentity=%s, mqttBroker=%s:%d",
        this.partnerIdentity,
        this.mqttBroker,
        this.mqttPort
      );
    }
  }
  async ensureAuthenticated() {
    if (!this.sid) {
      await this.login();
    }
  }
  setHome(homeId) {
    this.homeId = homeId;
  }
  async getHomes() {
    const result = await this.request("thing.m.location.extend.list", {});
    const homeIds = Object.keys(result || {});
    const homes = [];
    for (const homeId of homeIds) {
      let name = homeId;
      try {
        const detail = await this.request("m.life.location.get", { gid: Number(homeId) });
        if (detail == null ? void 0 : detail.name) {
          name = detail.name;
        }
      } catch (e) {
        this.log.warn("[TY] Failed to fetch home detail for %s: %s", homeId, e);
      }
      homes.push({ id: homeId, name });
    }
    return homes;
  }
  async getDevices() {
    var _a, _b, _c, _d, _e, _f;
    const result = await this.request("thing.m.my.group.device.list", {}, this.homeId);
    this.log.debug("[TY] API returned %d raw device(s) for home %s", (_a = result == null ? void 0 : result.length) != null ? _a : 0, this.homeId);
    const devices = [];
    for (const device of result) {
      const lk = device.localKey || device.local_key;
      if (lk) {
        this.localKeys.set(device.devId, lk);
      }
      const isSubDevice = !!(((_b = device.deviceTopo) == null ? void 0 : _b.parentDevId) || device.parent_id);
      const deviceType = this.classifyDevice(device);
      if (deviceType === import_constants.DEVICE_TYPE_GATEWAY) {
        this.log.debug("[TY] Skipping gateway device: %s (%s)", device.name, device.devId);
        continue;
      }
      const productId = device.productId || device.product_id || "";
      if (import_constants.SOCKET_PRODUCT_IDS.has(productId) || /socket/i.test(device.name || "")) {
        this.log.debug("[TY] Skipping socket device: %s (%s)", device.name, device.devId);
        continue;
      }
      const { zoneSwitchDps, zoneNames } = this.detectValveZones(device);
      devices.push({
        id: device.devId || device.id || "",
        name: device.name,
        model: device.model || device.productVer || device.productId || "",
        productId: device.productId || device.product_id || "",
        deviceName: device.devId || device.id || "",
        online: (_d = (_c = device.cloudOnline) != null ? _c : device.online) != null ? _d : device.connectionStatus === 1,
        portNumber: zoneSwitchDps.length,
        portDescribe: zoneNames,
        deviceType,
        isSubDevice,
        parentId: ((_e = device.deviceTopo) == null ? void 0 : _e.parentDevId) || device.parent_id || void 0,
        addr: 0,
        // Mesh node id — the `cid` field in MQTT DP pushes on the gateway's
        // topic identifies which sub-device the update is for.
        nodeId: (_f = device.deviceTopo) == null ? void 0 : _f.nodeId,
        zoneSwitchDps
      });
    }
    this.deviceCache = new Map(devices.map((d) => [d.id, d]));
    await this.resolveZoneDpsFromSchema(devices);
    this.log.debug("[TY] Normalized %d device(s) after filtering gateways", devices.length);
    return devices;
  }
  /**
   * Fetch thing.m.product.thing.model for each distinct productId and resolve
   * the per-zone control/status DPs (WorkStatus, ManualTimer, ManualSwitch,
   * RemainTime) by code name. Populates device.zoneDps. Cached per productId for
   * the process lifetime.
   *
   * Verified schema (live capture) for two RainPoint irrigation products:
   *   ew946yrp3pgbaziu (1-zone): WorkStatus=106, ManualTimer=107,
   *     ManualSwitch=108, LeftTime=109
   *   pjnbcfv3bzwg4yyo (2-zone): zone1 Left* = 106/107/108/109,
   *     zone2 Right* = 153/154/155/156
   *
   * For products without a thing.model (or without WorkStatus DPs), zoneDps is
   * left undefined and the caller falls back to the +offset heuristic.
   */
  productSchemaCache = /* @__PURE__ */ new Map();
  async resolveZoneDpsFromSchema(devices) {
    var _a, _b;
    const productIds = Array.from(new Set(devices.map((d) => d.productId).filter(Boolean)));
    for (const pid of productIds) {
      if (this.productSchemaCache.has(pid) || pid === "(none)") {
        continue;
      }
      try {
        const model = await this.request("thing.m.product.thing.model", {
          productId: pid,
          productVersion: "1.0.0"
        });
        const props = (_b = (_a = model == null ? void 0 : model.services) == null ? void 0 : _a.flatMap((s) => {
          var _a2;
          return (_a2 = s.properties) != null ? _a2 : [];
        })) != null ? _b : [];
        this.productSchemaCache.set(pid, props);
        this.log.debug("[TY] thing.model for %s: %d properties", pid, props.length);
      } catch (error) {
        this.log.warn("[TY] Failed to fetch thing.model for %s: %s", pid, error);
        this.productSchemaCache.set(pid, []);
      }
    }
    for (const device of devices) {
      const props = this.productSchemaCache.get(device.productId);
      if (!props || props.length === 0) {
        continue;
      }
      const zones = this.groupPropertiesByZone(props);
      if (zones.length === 0) {
        continue;
      }
      const batteryProp = props.find(
        (p) => p.code === "BatteryCapacity" || p.code === "battery_percentage" || p.code === "residual_electricity"
      );
      if (batteryProp) {
        device.batteryDp = batteryProp.abilityId;
      }
      device.zoneDps = zones.map((z) => {
        var _a2, _b2, _c, _d, _e, _f, _g, _h;
        return {
          workStatus: (_b2 = (_a2 = z.byCode.WorkStatus) != null ? _a2 : z.byCode.ManualSwitch) != null ? _b2 : 0,
          manualTimer: (_c = z.byCode.ManualTimer) != null ? _c : 0,
          manualSwitch: (_d = z.byCode.ManualSwitch) != null ? _d : 0,
          remainTime: (_f = (_e = z.byCode.RemainTime) != null ? _e : z.byCode.LeftTime) != null ? _f : 0,
          flow: (_h = (_g = z.byCode.Flow) != null ? _g : z.byCode.RithtFlow) != null ? _h : 0
        };
      });
      if (zones.length > device.portNumber) {
        device.portNumber = zones.length;
        if (device.portDescribe.length < zones.length) {
          for (let i = device.portDescribe.length; i < zones.length; i++) {
            device.portDescribe.push(zones[i].name);
          }
        }
      }
      this.log.debug(
        "[TY] %s resolved %d zone(s) from schema: %s",
        device.name,
        zones.length,
        JSON.stringify(device.zoneDps)
      );
    }
  }
  /**
   * Group thing.model properties into zones. RainPoint irrigation codes use a
   * Left/Right prefix for multi-zone products and bare codes for single-zone —
   * BUT some single-zone products ALSO have a `LeftTime` code where "Left" is
   * part of the name, not a zone prefix. We distinguish them by checking whether
   * the SAME role exists with both Left and Right prefixes: if both
   * LeftWorkStatus and RightWorkStatus exist, the product is multi-zone and the
   * prefix is a zone marker; otherwise bare codes form one zone.
   *
   * Returns one entry per zone, in zone order (Left before Right, unprefixed =
   * single zone). Each zone's byCode map indexes the code WITHOUT its prefix
   * (e.g. "RightWorkStatus" -> "WorkStatus") so the same lookup works per zone.
   */
  groupPropertiesByZone(props) {
    var _a, _b;
    const codes = new Set(props.map((p) => {
      var _a2;
      return (_a2 = p.code) != null ? _a2 : "";
    }).filter(Boolean));
    const hasLeftRightZoneScheme = ["WorkStatus", "ManualSwitch", "ManualTimer"].some(
      (role) => codes.has(`Left${role}`) && codes.has(`Right${role}`)
    );
    const zones = /* @__PURE__ */ new Map();
    for (const p of props) {
      const code = p.code === "RithtFlow" ? "RightFlow" : (_a = p.code) != null ? _a : "";
      let prefix = "";
      let role = code;
      if (hasLeftRightZoneScheme) {
        const m = code.match(/^(Left|Right)(.+)$/);
        if (m) {
          prefix = m[1];
          role = m[2];
        }
      }
      if (!zones.has(prefix)) {
        zones.set(prefix, {});
      }
      zones.get(prefix)[role] = p.abilityId;
    }
    const order = ["", "Left", "Right"];
    const sortedPrefixes = Array.from(zones.keys()).sort((a, b) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      if (ia !== -1 && ib !== -1) {
        return ia - ib;
      }
      if (ia !== -1) {
        return -1;
      }
      if (ib !== -1) {
        return 1;
      }
      return a.localeCompare(b);
    });
    const DEFAULT_NAMES = { "": "Valve", Left: "Left Valve", Right: "Right Valve" };
    const result = [];
    for (const prefix of sortedPrefixes) {
      const byCode = zones.get(prefix);
      if (byCode.WorkStatus === void 0 && byCode.ManualSwitch === void 0) {
        continue;
      }
      result.push({ name: (_b = DEFAULT_NAMES[prefix]) != null ? _b : prefix, byCode });
    }
    return result;
  }
  /**
   * Public escape hatch for diagnostics / RE: call any Tuya mobile API action by
   * name with arbitrary postData and return the raw decrypted response. Reuses
   * the full request pipeline (signing, AES-GCM encrypt/decrypt, sid injection)
   * so it exercises the EXACT same wire path as production calls. Used by the
   * standalone schema-probe script archived in the homebridge-re-tools repo.
   */
  async debugRequest(action, data, requireSid = true) {
    return this.request(action, data, requireSid);
  }
  async getDeviceStatuses(deviceIds) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
    const result = /* @__PURE__ */ new Map();
    const devices = await this.getDevices();
    for (const deviceId of deviceIds) {
      const device = devices.find((d) => d.id === deviceId);
      if (!device) {
        continue;
      }
      try {
        const statusResult = await this.request("thing.m.device.dp.get", {
          devId: deviceId
        });
        this.log.debug("[TY] dp.get for %s (%s): %s", deviceId, device.name, JSON.stringify(statusResult));
        const dpsMap = /* @__PURE__ */ new Map();
        if (Array.isArray(statusResult)) {
          for (const item of statusResult) {
            dpsMap.set(item.code, item.value);
          }
        } else if (statusResult.dps) {
          for (const [key, value] of Object.entries(statusResult.dps)) {
            dpsMap.set(key, value);
          }
        } else if (statusResult && typeof statusResult === "object") {
          for (const [key, value] of Object.entries(statusResult)) {
            dpsMap.set(key, value);
          }
        }
        this.log.debug("[TY] %s parsed dps=%s", device.name, JSON.stringify(Object.fromEntries(dpsMap)));
        const zones = [];
        const switchDps = device.zoneSwitchDps;
        const zoneDps = device.zoneDps;
        for (let port = 1; port <= device.portNumber; port++) {
          const zd = zoneDps == null ? void 0 : zoneDps[port - 1];
          const runDp = (_a = zd == null ? void 0 : zd.workStatus) != null ? _a : (switchDps == null ? void 0 : switchDps[port - 1]) !== void 0 ? switchDps[port - 1] + 2 : void 0;
          const remainingDp = (_b = zd == null ? void 0 : zd.remainTime) != null ? _b : (switchDps == null ? void 0 : switchDps[port - 1]) !== void 0 ? switchDps[port - 1] + 3 : void 0;
          const flowDp = (zd == null ? void 0 : zd.flow) || (port === 1 ? 103 : port === 2 ? 152 : void 0);
          const work = (0, import_status_map.mapWorkStatus)(
            (0, import_status_map.dpValue)(dpsMap, runDp, "WorkStatus", "LeftWorkStatus", "RightWorkStatus")
          );
          const remainingMin = remainingDp !== void 0 ? Number(dpsMap.get(String(remainingDp))) : NaN;
          const remaining = Number.isFinite(remainingMin) && remainingMin > 0 ? Math.round(remainingMin * 60) : 0;
          zones.push({
            port,
            name: device.portDescribe[port - 1] || `Zone ${port}`,
            isOn: work.isOn,
            remainingDuration: remaining,
            lastWaterUsage: (0, import_status_map.parseNumberDp)((0, import_status_map.dpValue)(dpsMap, flowDp, "Flow", "LeftFlow", "RightFlow")),
            workStatus: work.code,
            workStatusText: work.text
          });
        }
        const moisture = (_f = (_e = (_d = (_c = dpsMap.get("9")) != null ? _c : dpsMap.get("14")) != null ? _d : dpsMap.get("humidity")) != null ? _e : dpsMap.get("soil_humidity")) != null ? _f : null;
        const temperature = (_j = (_i = (_h = (_g = dpsMap.get("10")) != null ? _g : dpsMap.get("15")) != null ? _h : dpsMap.get("temperature")) != null ? _i : dpsMap.get("temp_current")) != null ? _j : null;
        const battery = (0, import_status_map.mapBattery)(
          (0, import_status_map.dpValue)(
            dpsMap,
            device.batteryDp,
            105,
            "BatteryCapacity",
            "11",
            "17",
            "battery_percentage",
            "residual_electricity"
          )
        );
        result.set(deviceId, {
          deviceId,
          online: device.online,
          zones,
          moisture,
          temperature,
          battery: battery.percent,
          batteryState: battery.text
        });
      } catch (error) {
        this.log.error("Failed to get status for device %s: %s", deviceId, error);
      }
    }
    return result;
  }
  async turnZoneOn(deviceId, port, durationSeconds) {
    var _a, _b;
    const device = this.deviceCache.get(deviceId);
    const zoneDp = (_a = device == null ? void 0 : device.zoneDps) == null ? void 0 : _a[port - 1];
    const manualTimerDp = (_b = zoneDp == null ? void 0 : zoneDp.manualTimer) != null ? _b : this.resolveSwitchDp(deviceId, port) + 3;
    const manualSwitchDp = zoneDp == null ? void 0 : zoneDp.manualSwitch;
    const gwId = this.resolveGwId(deviceId);
    const durationMin = durationSeconds ? Math.min(60, Math.max(1, Math.round(durationSeconds / 60))) : 10;
    const dps = { [String(manualTimerDp)]: durationMin };
    if (manualSwitchDp) {
      dps[String(manualSwitchDp)] = false;
    }
    this.log.debug(
      "[TY] dp.publish ON: devId=%s gwId=%s port=%d dps=%s",
      deviceId,
      gwId,
      port,
      JSON.stringify(dps)
    );
    const result = await this.request(
      "thing.m.device.dp.publish",
      {
        gwId,
        devId: deviceId,
        dps: JSON.stringify(dps)
      },
      this.homeId || true
    );
    this.log.debug("[TY] dp.publish ON result for %s: %s", deviceId, JSON.stringify(result));
  }
  async turnZoneOff(deviceId, port) {
    var _a, _b;
    const device = this.deviceCache.get(deviceId);
    const zoneDp = (_a = device == null ? void 0 : device.zoneDps) == null ? void 0 : _a[port - 1];
    const gwId = this.resolveGwId(deviceId);
    const dps = {};
    if (zoneDp == null ? void 0 : zoneDp.manualSwitch) {
      dps[String(zoneDp.manualSwitch)] = true;
    } else {
      const manualTimerDp = (_b = zoneDp == null ? void 0 : zoneDp.manualTimer) != null ? _b : this.resolveSwitchDp(deviceId, port) + 3;
      dps[String(manualTimerDp)] = 0;
    }
    this.log.debug(
      "[TY] dp.publish OFF: devId=%s gwId=%s port=%d dps=%s",
      deviceId,
      gwId,
      port,
      JSON.stringify(dps)
    );
    const result = await this.request(
      "thing.m.device.dp.publish",
      {
        gwId,
        devId: deviceId,
        dps: JSON.stringify(dps)
      },
      this.homeId || true
    );
    this.log.debug("[TY] dp.publish OFF result for %s: %s", deviceId, JSON.stringify(result));
  }
  /**
   * Resolve the gateway devId for a dp.publish command. RainPoint TY irrigation
   * zones are sub-devices of a parent gateway; the cloud forwards the DP to the
   * gateway, which relays it to the sub-device. If the cached device has a
   * parentId, use it; otherwise the device is its own gateway (gwId == devId).
   */
  resolveGwId(deviceId) {
    const device = this.deviceCache.get(deviceId);
    if (device == null ? void 0 : device.parentId) {
      return device.parentId;
    }
    return deviceId;
  }
  /**
   * Resolve a 1-based zone port number to the device's valve switch DP.
   * Uses the cached device's zoneSwitchDps when available (populated by
   * getDevices); falls back to the port number itself for legacy devices.
   */
  resolveSwitchDp(deviceId, port) {
    const device = this.deviceCache.get(deviceId);
    if ((device == null ? void 0 : device.zoneSwitchDps) && device.zoneSwitchDps[port - 1] !== void 0) {
      return device.zoneSwitchDps[port - 1];
    }
    return port;
  }
  /**
   * Classify a TY device. The thing.m.my.group.device.list response has NO
   * `category` field (unlike the classic Tuya device list), so we classify by
   * structure + datapoints instead:
   *   - Gateway: deviceTopo is empty/missing AND it's the parent (other devices
   *     point at it via deviceTopo.parentDevId). Detected by absence of a
   *     parentDevId.
   *   - Sensor: a sub-device whose dps has no irrigation valve DP. (RainPoint
   *     sensors are rare in this OEM; we currently treat every sub-device as a
   *     valve unless its productId/dps indicates otherwise.)
   *   - Valve / irrigation: any sub-device with a parentDevId.
   *
   * Returns the HomGar-style device type strings (DEVICE_TYPE_GATEWAY / VALVE /
   * SENSOR / IRRIGATION) so platform.ts's existing routing works unchanged.
   */
  classifyDevice(device) {
    var _a;
    const hasParent = !!(((_a = device.deviceTopo) == null ? void 0 : _a.parentDevId) || device.parent_id);
    if (!hasParent) {
      return import_constants.DEVICE_TYPE_GATEWAY;
    }
    return import_constants.DEVICE_TYPE_VALVE;
  }
  /**
   * Detect per-zone valve switch datapoints for a RainPoint TY irrigation device.
   *
   * The RainPoint TY controller exposes each valve as a distinct DP. Observed
   * pattern (from a captured 3-device account):
   *   - Single-valve device (Front Garden R/L, productId ew946yrp3pgbaziu):
   *     DPs 101-128, valve on/off = DP 104 (boolean).
   *   - Split 2-valve device (Back Garden, productId pjnbcfv3bzwg4yyo):
   *     DPs 101-128 (zone 1, switch 104) AND DPs 150-167 (zone 2, switch 155,
   *     dpName "Right Valve"). The switch DPs pair by +51: 104 <-> 155.
   *
   * IMPORTANT: a valve group's switch DP may be ABSENT from the current dps
   * snapshot when the device is offline (e.g. Back Garden, cloudOnline=false,
   * omits DP 104 even though the valve exists). So zone COUNT is determined by
   * DP-range presence (a group exists if ANY dps fall in its range), NOT by
   * whether the specific switch DP is currently reported. The switch DP is then
   * assigned by the +51 pattern regardless of snapshot presence — status
   * polling reads it if present, else reports the zone as off.
   *
   * Group ranges (each spans ~28 DPs centered on its switch DP):
   *   group 1: DPs  90-149  (switch 104)
   *   group 2: DPs 141-200  (switch 155)  — overlaps group 1, so we instead
   *   use non-overlapping buckets: group N owns DPs in [101+51*(N-1), 150+51*(N-1)]
   *
   * We also honor dpName entries containing "Valve" as explicit switch DPs
   * (defensive for future firmware that may use a different pattern).
   *
   * Returns the switch DP IDs (ascending) and per-zone names (from dpName when
   * available, else the device name for single-zone, else "Zone N").
   */
  detectValveZones(device) {
    var _a, _b, _c, _d, _e;
    const dps = (_c = (_b = (_a = device.dataPointInfo) == null ? void 0 : _a.dps) != null ? _b : device.dps) != null ? _c : {};
    const dpName = (_e = (_d = device.dataPointInfo) == null ? void 0 : _d.dpName) != null ? _e : {};
    const dpKeys = Object.keys(dps).map((k) => Number(k)).filter((n) => !Number.isNaN(n));
    const MAX_ZONES = 8;
    const GROUP_SPAN = 51;
    const GROUP_START = 101;
    const SWITCH_BASE = 104;
    const GROUP_WIDTH = 49;
    const switchDps = [];
    for (let n = 0; n < MAX_ZONES; n++) {
      const rangeLo = GROUP_START + GROUP_SPAN * n;
      const rangeHi = rangeLo + GROUP_WIDTH;
      const hasGroupDp = dpKeys.some((k) => k >= rangeLo && k <= rangeHi);
      if (hasGroupDp) {
        switchDps.push(SWITCH_BASE + GROUP_SPAN * n);
      }
    }
    for (const [dpStr, name] of Object.entries(dpName)) {
      if (typeof name !== "string" || !/valve/i.test(name)) {
        continue;
      }
      const dp = Number(dpStr);
      if (!Number.isNaN(dp) && !switchDps.includes(dp)) {
        switchDps.push(dp);
      }
    }
    switchDps.sort((a, b) => a - b);
    if (switchDps.length === 0) {
      this.log.warn(
        "[TY] No valve groups detected for %s (productId=%s); assuming single zone with legacy DP 1. dps keys: %s",
        device.name,
        device.productId,
        Object.keys(dps).join(",")
      );
      return {
        zoneSwitchDps: [1],
        zoneNames: [device.name]
      };
    }
    const DEFAULT_NAMES = { 0: "Left Valve", 1: "Right Valve" };
    const zoneNames = switchDps.map((dp, i) => {
      var _a2;
      const named = dpName[String(dp)];
      if (typeof named === "string" && named.trim()) {
        return named;
      }
      if (switchDps.length === 1) {
        return device.name;
      }
      return (_a2 = DEFAULT_NAMES[i]) != null ? _a2 : `Zone ${i + 1}`;
    });
    this.log.debug(
      "[TY] %s: detected %d zone(s) switchDps=%s names=%s",
      device.name,
      switchDps.length,
      switchDps.join(","),
      JSON.stringify(zoneNames)
    );
    return { zoneSwitchDps: switchDps, zoneNames };
  }
  getDeviceType(category) {
    switch ((category || "").toLowerCase()) {
      case "sf":
        return import_constants.DEVICE_TYPE_IRRIGATION;
      case "wg2":
      case "sz":
        return import_constants.DEVICE_TYPE_VALVE;
      case "sensor":
        return import_constants.DEVICE_TYPE_SENSOR;
      default:
        return category || import_constants.DEVICE_TYPE_VALVE;
    }
  }
  /**
   * Make a Tuya mobile API request.
   *
   * Based on APK decompilation of ThingApiParams.getRequestBody():
   * - HTTP POST to the bare endpoint URL (no query params)
   * - Body is application/x-www-form-urlencoded
   * - postData in the body is the RAW JSON string (not hashed)
   * - postData in the sign string is mobileHash(postData)
   * - The sign covers both URL params and postData (hashed)
   */
  async request(action, data, requireSid = true, retried = false) {
    var _a;
    if (requireSid !== false) {
      await this.ensureAuthenticated();
    }
    const gid = typeof requireSid === "string" ? requireSid : void 0;
    const needsSid = requireSid !== false;
    const d = /* @__PURE__ */ new Date();
    const postDataStr = JSON.stringify(data);
    const requestId = import_node_crypto.default.randomUUID();
    this.log.debug("[TY] plaintext postData for %s: %s", action, postDataStr);
    const ecode = requireSid === false ? void 0 : this.ecode || void 0;
    const encKey = deriveEncryptoKey(requestId, ecode);
    const encryptedPostData = aesGcmEncryptBase64(encKey, postDataStr);
    const apiVersion = (_a = API_VERSIONS[action]) != null ? _a : "*";
    const apiName = finalizeApiName(action);
    const signMap = {
      a: apiName,
      deviceId: this.deviceId,
      os: "Android",
      lang: "en_US",
      v: apiVersion,
      clientId: APP_KEY,
      time: Math.round(d.getTime() / 1e3).toString(),
      postData: mobileHash(encryptedPostData),
      // hashed encrypted postData for sign
      et: API_ET_VERSION,
      ttid: TTID,
      appVersion: "1.2.5",
      requestId,
      chKey: CH_KEY
    };
    if (gid) {
      signMap.gid = gid;
    }
    if (needsSid && this.sid) {
      signMap.sid = this.sid;
    }
    const valuesToSign = /* @__PURE__ */ new Set([
      "a",
      "v",
      "lat",
      "lon",
      "lang",
      "deviceId",
      "appVersion",
      "ttid",
      "isH5",
      "h5Token",
      "os",
      "clientId",
      "postData",
      "time",
      "requestId",
      "et",
      "n4h5",
      "sid",
      "sp",
      "chKey"
    ]);
    const sortedKeys = Object.keys(signMap).sort();
    let strToSign = "";
    for (const key of sortedKeys) {
      if (!valuesToSign.has(key) || !signMap[key]) {
        continue;
      }
      if (strToSign) {
        strToSign += "||";
      }
      strToSign += `${key}=${signMap[key]}`;
    }
    const sign = import_node_crypto.default.createHmac("sha256", HMAC_KEY).update(strToSign).digest("hex");
    const bodyParams = {
      postData: encryptedPostData,
      // ENCRYPTED base64 in body
      sign,
      a: apiName,
      deviceId: this.deviceId,
      os: "Android",
      lang: "en_US",
      v: apiVersion,
      clientId: APP_KEY,
      time: signMap.time,
      et: API_ET_VERSION,
      cp: "gzip",
      ttid: TTID,
      appVersion: "1.2.5",
      appRnVersion: "5.97",
      sdkVersion: "6.8.0",
      deviceCoreVersion: "6.8.0",
      osSystem: "17",
      platform: "sdk_gphone16k_arm64",
      timeZoneId: "America/Los_Angeles",
      channel: "oem",
      nd: "1",
      customDomainSupport: "1",
      requestId: signMap.requestId,
      chKey: CH_KEY,
      bizData: JSON.stringify({ brand: "google", customDomainSupport: "1", nd: "1", sdkInt: "37" })
    };
    if (gid) {
      bodyParams.gid = gid;
    }
    if (needsSid && this.sid) {
      bodyParams.sid = this.sid;
    }
    const bodyStr = formUrlEncode(bodyParams);
    const urlObj = new import_node_url.URL(this.endpoint);
    this.log.debug("[TY] POST %s", this.endpoint);
    this.log.debug("[TY] sign string: %s", strToSign);
    this.log.debug("[TY] body: %s", bodyStr);
    const SESSION_ERROR_CODES = /* @__PURE__ */ new Set([
      "SESSION_EXPIRED",
      "SESSION_INVALID",
      "INVALID_SESSION",
      "SID_INVALID",
      "NOT_LOGIN",
      "Frequently_Invoke"
    ]);
    const doRequest = () => new Promise((resolve, reject) => {
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Thing-UA=APP/Android/1.2.5/SDK/6.8.0",
          Connection: "keep-alive",
          channel_type: "oem_app",
          channel_key: APP_KEY,
          "x-client-trace-id": signMap.requestId
        },
        rejectUnauthorized: false
      };
      const req = import_node_https.default.request(options, (res) => {
        let responseData = "";
        res.on("data", (chunk) => {
          responseData += chunk;
        });
        res.on("end", () => {
          this.log.debug("[TY] Response: %s", responseData);
          try {
            const parsed = JSON.parse(responseData);
            let decoded = parsed;
            if (parsed && typeof parsed === "object" && "sign" in parsed && "result" in parsed && !("success" in parsed)) {
              const requestId2 = signMap.requestId;
              const resultB64 = parsed.result;
              this.log.debug(
                "[TY] Response is encrypted (sign=%s), decrypting (requestId=%s)...",
                parsed.sign,
                requestId2
              );
              const decKey = deriveEncryptoKey(requestId2, ecode);
              const decryptedJson = aesGcmDecryptBase64(decKey, resultB64);
              this.log.debug("[TY] Decrypted response: %s", decryptedJson);
              decoded = JSON.parse(decryptedJson);
            }
            const apiResp = decoded;
            if (!apiResp.success) {
              reject(
                new TuyaApiError(
                  `Tuya API error: ${apiResp.errorMsg || "Unknown"} (code: ${String(apiResp.errorCode)})`,
                  apiResp.errorCode
                )
              );
              return;
            }
            resolve(apiResp.result);
          } catch (e) {
            reject(
              new Error(
                `Failed to parse Tuya API response: ${e instanceof Error ? e.message : String(e)}`
              )
            );
          }
        });
      });
      req.on("error", (e) => {
        reject(new Error(`HTTP request failed: ${e.message}`));
      });
      req.setTimeout(2e4, () => {
        req.destroy(new Error("Request timed out"));
      });
      req.write(bodyStr);
      req.end();
    });
    return doRequest().catch((err) => {
      const code = err == null ? void 0 : err.code;
      const wasUsingRestoredSid = this.sessionRestored || needsSid && this.sid;
      if (code && SESSION_ERROR_CODES.has(code) && wasUsingRestoredSid && !retried) {
        this.log.warn("[TY] Session rejected (code=%s) \u2014 clearing saved session and re-logging in...", code);
        this.clearSession();
        return this.login().then(() => {
          return this.request(action, data, requireSid, true);
        });
      }
      throw err;
    });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  RainPointTyClient
});
//# sourceMappingURL=ty-client.js.map
