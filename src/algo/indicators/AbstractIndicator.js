"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractIndicator = exports.MarketDepthParams = exports.LiquidatorParams = exports.IchimokuIndicatorParams = exports.OrderbookHeatIndicatorParams = exports.PivotsHLParams = exports.PivotPointsParams = exports.VolumeProfileParams = exports.STCIndicatorParams = exports.ESSIndicatorParams = exports.TristarParams = exports.VIXParams = exports.SarParams = exports.BolloingerBandsParams = exports.StochRSIIndicatorParams = void 0;
const utils = __importStar(require("@ekliptor/apputils"));
const logger = utils.logger, nconf = utils.nconf;
const TaLib_1 = require("./TaLib");
//import {AbtractCryptotraderIndicator} from "./AbtractCryptotraderIndicator"; // circular reference: parent - child
const DataPlotCollector_1 = require("./DataPlotCollector");
const bit_models_1 = require("@ekliptor/bit-models");
class StochRSIIndicatorParams {
    constructor() {
        this.optInFastK_Period = 5;
        this.optInFastD_Period = 3;
        this.optInFastD_MAType = 0;
    }
}
exports.StochRSIIndicatorParams = StochRSIIndicatorParams;
class BolloingerBandsParams {
    constructor() {
        this.N = 20; // time period for MA
        this.K = 2; // factor for upper/lower band
        this.MAType = 0; // moving average type, 0 = SMA
        /**
         * 0=SMA
         1=EMA
         2=WMA
         3=DEMA
         4=TEMA
         5=TRIMA
         6=KAMA
         7=MAMA
         8=T3
         * https://cryptotrader.org/topics/203955/thanasis-all-indicators-code
         */
        this.bandwidthHistoryLen = 60; // default 3*N
        this.bandwidthHistoryLen = 3 * this.N;
    }
}
exports.BolloingerBandsParams = BolloingerBandsParams;
class SarParams {
    constructor() {
        this.accelerationFactor = 0.02; // Acceleration Factor used up to the Maximum value
        this.accelerationMax = 0.2; // Acceleration Factor Maximum value
    }
}
exports.SarParams = SarParams;
class VIXParams {
    constructor() {
        this.stddevPriod = 20; // works better with this value, see Bollinger
    }
}
exports.VIXParams = VIXParams;
class TristarParams {
    constructor() {
        this.interval = 30; // works better with this value
    }
}
exports.TristarParams = TristarParams;
class ESSIndicatorParams {
    constructor() {
        this.numberOfPoles = 2;
    }
}
exports.ESSIndicatorParams = ESSIndicatorParams;
class STCIndicatorParams {
    constructor() {
        this.fast = 23; // number of fast EMA candles
        this.slow = 50; // number of slow EMA candles
        this.stcLength = 10; // MACD signal + STC candles
        this.factor = 0.5;
    }
}
exports.STCIndicatorParams = STCIndicatorParams;
class VolumeProfileParams {
    constructor() {
        this.interval = 48; // the number of candles to compute the volume profile from
        this.volumeRows = 24; // the number of equally-sized price zones
        this.valueAreaPercent = 70;
        this.useSingleTrades = true; // use single trades to compute volume profile (if available) or candle close prices
    }
}
exports.VolumeProfileParams = VolumeProfileParams;
class PivotPointsParams {
    constructor() {
        this.type = "standard";
        this.interval = 15; // the number of candles to use for high/low calculation
    }
}
exports.PivotPointsParams = PivotPointsParams;
class PivotsHLParams {
    constructor() {
        this.leftLen = 14; // the number of candles to go back after a high/low
        this.rightLen = 14; // the number of candles to go forward after a high/low
    }
}
exports.PivotsHLParams = PivotsHLParams;
class OrderbookHeatIndicatorParams {
    constructor() {
        this.interval = 14; // number of candles for the indicator
        this.priceStepBucket = 0.1; // The orderbook granularity, meaning how much of a price change in the order book shall be combined in a single bucket.
    }
}
exports.OrderbookHeatIndicatorParams = OrderbookHeatIndicatorParams;
class IchimokuIndicatorParams {
    constructor() {
        this.conversionPeriod = 9;
        this.basePeriod = 26;
        this.spanPeriod = 52;
        this.displacement = 26;
    }
}
exports.IchimokuIndicatorParams = IchimokuIndicatorParams;
class LiquidatorParams {
    constructor() {
        this.feed = "BitmexMarketData";
        //exchangePairs: Currency.CurrencyPair[] = [new Currency.CurrencyPair(Currency.Currency.USD, Currency.Currency.BTC)];
        this.currencyPairs = ["USD_BTC"]; // value is parsed to CurrencyPair
        this.interval = 15; // the number of candles to store liquidations for
    }
    getPairs() {
        let pairs = [];
        this.currencyPairs.forEach((pair) => {
            let pairObj = bit_models_1.Currency.CurrencyPair.fromString(pair);
            if (pairObj)
                pairs.push(pairObj);
            else if (this.enableLog)
                logger.warn("Unable to parse currency pair %s in %s Liquidator", pair, this.feed);
        });
        return pairs;
    }
}
exports.LiquidatorParams = LiquidatorParams;
class MarketDepthParams {
    constructor() {
        this.depthInterval = 6; // number of candles to keep data
        this.minUpdateIntervalMin = 30; // the minimum update interval in minutes (to prevent DDos)
    }
}
exports.MarketDepthParams = MarketDepthParams;
class AbstractIndicator extends DataPlotCollector_1.DataPlotCollector {
    constructor(params) {
        super();
        this.taLib = new TaLib_1.TaLib();
        // only present for trading indicators (not in lending mode)
        this.orderBook = null;
        // for line cross indicators
        this.shortLineValue = -1;
        this.longLineValue = -1;
        // for momentum indicators
        this.value = -1;
        this.loggedUnsupportedCandleUpdateOnTrade = false;
        if (AbstractIndicator.isLineCrossIndicator(params)) {
            if (typeof params.long === "number" && params.short === undefined) // for lending strategies we only use "long"
                params.short = Math.max(1, params.long - 1);
            if (params.short < 1)
                logger.error("Invalid params. 'short' has to be at least 1 in %s", this.className);
            else if (params.short >= params.long) {
                //logger.error("Invalid params. 'short' has to be strictly lower than 'long' in %s", this.className)
                params.long = params.short + 1; // fix the error here so Evulution/Backfind continues
                logger.warn("Invalid params. 'short' has to be strictly lower than 'long' in %s. Increasing long to %s", this.className, params.long);
            }
        }
        else if (AbstractIndicator.isMomentumIndicator(params)) {
            if (params.low >= params.high) {
                //logger.error("Invalid params. 'low' has to be strictly lower than 'high' in %s", this.className)
                params.high = params.low + 1;
                logger.warn("Invalid params. 'low' has to be strictly lower than 'high' in %s. Increasing high to %s", this.className, params.high);
            }
        }
        this.params = params;
    }
    addTrades(trades) {
        return new Promise((resolve, reject) => {
            // overwrite in subclass if this strategy uses trades
            resolve();
        });
    }
    addCandle(candle) {
        return new Promise((resolve, reject) => {
            // overwrite in subclass if this strategy uses candles
            resolve();
        });
    }
    removeLatestCandle() {
        // overwrite this if your indicator uses updateIndicatorsOnTrade to update its value within the same candle on live trades
        // usually means calling removeLatestData() on all number arrays of indicator values
    }
    addPricePoint(price) {
        return new Promise((resolve, reject) => {
            // overwrite in subclass if this strategy uses a price stream
            resolve();
        });
    }
    /**
     * Sets the order book ONLY if it hasn't already been set.
     * @param orderBook
     */
    setOrderBook(orderBook, avgMarketPrice) {
        //if (this.orderBook === null) // be safe in case reference gets updated
        this.orderBook = orderBook;
        this.avgMarketPrice = avgMarketPrice;
    }
    getLineDiff() {
        return this.shortLineValue - this.longLineValue;
    }
    getLineDiffPercent() {
        // ((y2 - y1) / y1)*100 - positive % if price is rising -> we are in an up trend
        return ((this.shortLineValue - this.longLineValue) / this.longLineValue) * 100;
    }
    getValue() {
        return this.value;
    }
    getShortLineValue() {
        return this.shortLineValue;
    }
    getLongLineValue() {
        return this.longLineValue;
    }
    /**
     * Get all current indicator values as an object.
     * Overwrite this in your subclas if required.
     * This function MUST return numeric values only, no nested objects (because we use them to train our neural network).
     * @returns {object}
     */
    getAllValues() {
        if (AbstractIndicator.isLineCrossIndicator(this.params)) {
            return {
                shortLineValue: this.shortLineValue,
                longLineValue: this.longLineValue
            };
        }
        else if (AbstractIndicator.isMomentumIndicator(this.params)) {
            return {
                value: this.value
            };
        }
        if (this.isReady() === true && this.value === -1)
            logger.error("getAllValues() should be implemented in %s", this.className);
        return { value: this.value };
    }
    getAllValueCount() {
        return Object.keys(this.getAllValues()).length;
    }
    /**
     * Serialize indicator data for bot restart.
     * State is normally stored in Strategies and only forwarded to indicators.
     * However, some indicators might need extra data.
     * @returns {{}}
     */
    serialize() {
        let state = {};
        state.value = this.value;
        return state;
    }
    unserialize(state) {
        if (state.value !== undefined)
            this.value = state.value;
    }
    // ################################################################
    // ###################### PRIVATE FUNCTIONS #######################
    /**
     * Add data points to our history array
     * @param {number[]} data
     * @param {number} add
     * @param {number} maxDataPoints
     * @param {boolean} keepMore
     * @returns {number[]} the history array with the new data point
     */
    addData(data, add, maxDataPoints = AbstractIndicator.MAX_DATAPOINTS_DEFAULT, keepMore = true) {
        data.push(add);
        // internally TA-LIB needs more data to compute a valid result for many indicators. so keep a lot more than our longest interval
        const max = keepMore === true ? maxDataPoints * AbstractIndicator.KEEP_OLD_DATA_FACTOR : maxDataPoints;
        if (data.length > max)
            data.shift();
        return data;
    }
    removeData(data, maxLen) {
        if (maxLen <= 0)
            return data; // unlimited
        while (data.length > maxLen)
            data.shift();
        return data;
    }
    removeLatestData(data) {
        if (data.length !== 0)
            data.splice(-1, 1);
        return data;
    }
    addDataAny(data, add, maxDataPoints = AbstractIndicator.MAX_DATAPOINTS_DEFAULT, keepMore = true) {
        data.push(add);
        // internally TA-LIB needs more data to compute a valid result for many indicators. so keep a lot more than our longest interval
        const max = keepMore === true ? maxDataPoints * AbstractIndicator.KEEP_OLD_DATA_FACTOR : maxDataPoints;
        if (data.length > max)
            data.shift();
        return data;
    }
    removeDataAny(data, maxLen) {
        if (maxLen <= 0)
            return data; // unlimited
        while (data.length > maxLen)
            data.shift();
        return data;
    }
    removeLatestDataAny(data) {
        if (data.length !== 0)
            data.splice(-1, 1);
        return data;
    }
    computeLineDiff(shortResult, longResult) {
        this.shortLineValue = TaLib_1.TaLib.getLatestResultPoint(shortResult);
        this.longLineValue = TaLib_1.TaLib.getLatestResultPoint(longResult);
        if (this.shortLineValue < 0 || this.longLineValue < 0)
            return;
        // low: 0.05%
        // high: 1.4%
        //logger.verbose("Computed %s line diff: %s - %s = %s (%s%)", this.className, this.shortLineValue, this.longLineValue, this.getLineDiff(), this.getLineDiffPercent().toFixed(3))
    }
    computeValue(result) {
        this.value = TaLib_1.TaLib.getLatestResultPoint(result);
        //if (this.value >= 0)
        //logger.verbose("Computed %s value: %s", this.className, this.getValue())
    }
    getTrueRange(candle, previousCandle) {
        // custom true range
        const range1 = candle.high - candle.low;
        const range2 = candle.high - previousCandle.close;
        const range3 = previousCandle.close - candle.low;
        let trueRange = range1;
        if (range1 >= range2 && range1 >= range3)
            trueRange = range1;
        if (range2 >= range1 && range2 >= range3)
            trueRange = range2;
        if (range3 >= range1 && range3 >= range2)
            trueRange = range3;
        return trueRange;
    }
    /**
     * Log arguments
     * @param args the arguments to log. You can't use %s, but arguments will be formatted as string.
     */
    log(...args) {
        if (!this.params.enableLog)
            return;
        logger.info("Indicator %s:", this.className, ...args);
    }
    /**
     * Log arguments as warning
     * @param args the arguments to log. You can't use %s, but arguments will be formatted as string.
     */
    warn(...args) {
        if (!this.params.enableLog)
            return;
        logger.warn("Indicator %s:", this.className, ...args);
    }
    static isLineCrossIndicator(params) {
        //if (nconf.get("lending"))
        return params.long !== undefined;
        //return params.short && params.long;
    }
    static isMomentumIndicator(params) {
        return params.interval && params.low && params.high;
    }
}
exports.AbstractIndicator = AbstractIndicator;
AbstractIndicator.KEEP_OLD_DATA_FACTOR = 70;
AbstractIndicator.MAX_DATAPOINTS_DEFAULT = 50;
// force loading dynamic imports for TypeScript
require("./ADLine");
require("./ADX");
require("./Aroon");
require("./AverageVolume");
require("./BollingerBands");
require("./BVOL");
require("./CCI");
require("./DEMA");
require("./EhlerTrendline");
require("./EMA");
require("./GannSwing");
require("./IchimokuClouds");
require("./Kairi");
require("./KAMA");
require("./Liquidator");
require("./MACD");
//import "./MarketDepth";
require("./MayerMultiple");
require("./MFI");
require("./NVTSignal");
require("./OBV");
require("./OpenInterest");
require("./OrderbookHeatmap");
require("./PivotPoints");
require("./RSI");
require("./SAR");
require("./Sentiment");
require("./SMA");
require("./SocialSentiment");
require("./STC");
require("./Stochastic");
require("./StochRSI");
require("./TristarPattern");
require("./VIX");
require("./VolumeProfile");
require("./VWMA");
