"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapIntervalFrom = exports.mapInterval = exports.mapCandle = void 0;
const invest_openapi_js_sdk_1 = __importDefault(require("@tinkoff/invest-openapi-js-sdk"));
const config_1 = __importDefault(require("config"));
const apiURL = "https://api-invest.tinkoff.ru/openapi";
const sandboxApiURL = "https://api-invest.tinkoff.ru/openapi/sandbox/";
const socketURL = "wss://api-invest.tinkoff.ru/openapi/md/v1/md-openapi/ws";
const secretToken = process.env.TOKEN; // токен для боевого api
const sandboxToken = config_1.default.get("tinkoffToken");
const api = new invest_openapi_js_sdk_1.default({
    apiURL: sandboxApiURL,
    secretToken: sandboxToken,
    socketURL,
});
exports.default = api;
const mapCandle = (ticker, candleIn) => ({
    open: candleIn.o,
    close: candleIn.c,
    high: candleIn.h,
    low: candleIn.l,
    volume: candleIn.v,
    time: Date.parse(candleIn.time),
    interval: (0, exports.mapInterval)(candleIn.interval),
    ticker,
});
exports.mapCandle = mapCandle;
const mapInterval = (val) => val;
exports.mapInterval = mapInterval;
const mapIntervalFrom = (val) => val;
exports.mapIntervalFrom = mapIntervalFrom;
