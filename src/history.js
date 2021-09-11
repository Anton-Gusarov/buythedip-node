"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tink_1 = __importDefault(require("./api/tink"));
const cache_1 = require("./cache/cache");
const store_1 = require("./store");
const api_1 = require("./api");
async function getHistory(ticker, { interval = store_1.Intervals.MIN1, toTime = new Date(Date.now()), fromTime = null, } = {}) {
    // let {interval, fromTime, toTime} = options
    const figi = await (0, cache_1.getCachedFigi)(ticker).catch(console.error);
    // - 2 hours
    if (!fromTime) {
        fromTime = new Date(toTime);
        fromTime.setUTCHours(toTime.getUTCHours() - 2);
    }
    let candles;
    try {
        candles = await tink_1.default.candlesGet({
            from: fromTime.toISOString(),
            to: toTime.toISOString(),
            figi,
            interval: interval,
        });
    }
    catch (e) {
        console.error(e);
        return [];
    }
    return candles.candles.map((candle) => (0, api_1.mapCandle)((0, cache_1.getTickerByFIGI)(candle.figi), candle));
}
exports.default = getHistory;
