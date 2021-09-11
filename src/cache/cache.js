"use strict";
// perhaps future api class
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTickerByFIGI = exports.getCachedFigi = void 0;
const tink_1 = __importDefault(require("../api/tink"));
const mongo_1 = __importDefault(require("../db/mongo"));
// figi->ticker
const mapTickerFIGI = {};
const mapFIGITicker = {};
async function getCachedFigi(ticker) {
    if (mapTickerFIGI[ticker])
        return mapTickerFIGI[ticker];
    const tickers = (0, mongo_1.default)().collection("tickers");
    let tickerDB;
    if (true === !!(tickerDB = await tickers.findOne({ ticker }))) {
        mapFIGITicker[tickerDB.figi] = ticker;
        mapTickerFIGI[ticker] = tickerDB.figi;
        return tickerDB.figi;
    }
    const { figi } = await tink_1.default.searchOne({ ticker });
    //TODO delayed insert
    await tickers.insertOne({
        figi,
        ticker,
    });
    mapFIGITicker[figi] = ticker;
    mapTickerFIGI[ticker] = figi;
    return figi;
}
exports.getCachedFigi = getCachedFigi;
// No db queries here because the app doesn't know any figis
function getTickerByFIGI(figi) {
    return mapFIGITicker[figi];
}
exports.getTickerByFIGI = getTickerByFIGI;
