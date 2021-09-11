"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tink_1 = __importDefault(require("../api/tink"));
const cache_1 = require("../cache/cache");
const utils_1 = require("../utils");
function createGenerators(tickers) {
    return Promise.all(tickers.map(async (ticker) => {
        const figi = await (0, cache_1.getCachedFigi)(ticker).catch(console.error);
        return (0, utils_1.Generatorify)(tink_1.default.candle.bind(tink_1.default), { figi });
    }));
}
exports.default = createGenerators;
