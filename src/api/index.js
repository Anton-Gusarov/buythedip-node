"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapCandle = exports.mapIntervalFrom = exports.mapInterval = void 0;
const tink_1 = require("./tink");
// improve after second provider added
function mapInterval(v) {
    return (0, tink_1.mapInterval)(v);
}
exports.mapInterval = mapInterval;
function mapIntervalFrom(v) {
    return (0, tink_1.mapIntervalFrom)(v);
}
exports.mapIntervalFrom = mapIntervalFrom;
function mapCandle(ticker, candleIn) {
    const newCandle = (0, tink_1.mapCandle)(ticker, candleIn);
    return newCandle;
}
exports.mapCandle = mapCandle;
