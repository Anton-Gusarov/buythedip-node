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
exports.BollingerBands = void 0;
const utils = __importStar(require("@ekliptor/apputils"));
const logger = utils.logger, nconf = utils.nconf;
const AbstractIndicator_1 = require("./AbstractIndicator");
const TaLib_1 = require("./TaLib");
class BollingerBands extends AbstractIndicator_1.AbstractIndicator {
    constructor(params) {
        super(params);
        this.valuesBollinger = [];
        this.upperValue = -1;
        this.middleValue = -1;
        this.lowerValue = -1;
        this.bandwidthHistory = [];
        this.params = Object.assign(new AbstractIndicator_1.BolloingerBandsParams(), this.params); // params come in without type (ok for interfaces)
    }
    addCandle(candle) {
        return new Promise((resolve, reject) => {
            this.valuesBollinger = this.addData(this.valuesBollinger, candle.close, this.params.N);
            if (this.valuesBollinger.length < this.params.N)
                return resolve(); // not enough data yet
            let bollingerParams = new TaLib_1.TaLibParams("BBANDS", this.valuesBollinger, this.params.N);
            bollingerParams.optInNbDevUp = this.params.K;
            bollingerParams.optInNbDevDn = this.params.K;
            bollingerParams.optInMAType = this.params.MAType;
            this.taLib.calculate(bollingerParams).then((result) => {
                this.computeValues(result);
                resolve();
            }).catch((err) => {
                reject(err);
            });
        });
    }
    removeLatestCandle() {
        this.valuesBollinger = this.removeLatestData(this.valuesBollinger);
    }
    isReady() {
        return this.upperValue !== -1 && this.middleValue !== -1 && this.lowerValue !== -1 && this.valuesBollinger.length >= this.params.N;
    }
    /**
     * Get %b
     * https://en.wikipedia.org/wiki/Bollinger_Bands
     * @param lastPrice the current market price
     * @returns {number} 1 = price at upper band, 0 = price at lower band. Price can be outside the bands = higher 1 or lower 0
     */
    getPercentB(lastPrice) {
        return (lastPrice - this.lowerValue) / (this.upperValue - this.lowerValue);
    }
    /**
     * A measure of volatility. Higher values mean higher volatility.
     * @returns {number}
     */
    getBandwidth() {
        return (this.upperValue - this.lowerValue) / this.middleValue;
    }
    /**
     * Indicates how much the current bandwidth is away from the average bandwidth (over the last 3*N candles).
     * @returns {number} 1 if current bandwidth === average, < 1 if current bw is less, > 1 if current bw is greater than avg bw
     */
    getBandwidthAvgFactor() {
        if (this.bandwidthHistory.length < this.params.bandwidthHistoryLen)
            return 1;
        let sum = 0;
        for (let i = 0; i < this.bandwidthHistory.length; i++)
            sum += this.bandwidthHistory[i];
        let avg = sum / this.bandwidthHistory.length;
        return this.getBandwidth() / avg;
    }
    getUpperValue() {
        return this.upperValue;
    }
    getMiddleValue() {
        return this.middleValue;
    }
    getLowerValue() {
        return this.lowerValue;
    }
    getAllValues() {
        let last = this.valuesBollinger.length !== 0 ? this.valuesBollinger[this.valuesBollinger.length - 1] : 0;
        return {
            percentB: this.getPercentB(last),
            bandwidth: this.getBandwidth(),
            bandwidthAvgFactor: this.getBandwidthAvgFactor(),
            upperValue: this.upperValue,
            middleValue: this.middleValue,
            lowerValue: this.lowerValue
        };
    }
    // ################################################################
    // ###################### PRIVATE FUNCTIONS #######################
    computeValues(result) {
        this.upperValue = TaLib_1.TaLib.getLatestResultPoint(result, "outRealUpperBand");
        this.middleValue = TaLib_1.TaLib.getLatestResultPoint(result, "outRealMiddleBand");
        this.lowerValue = TaLib_1.TaLib.getLatestResultPoint(result, "outRealLowerBand");
        //if (this.upperValue >= 0 && this.middleValue >= 0 && this.lowerValue >= 0)
        //logger.verbose("Computed %s values: upper %s, middle %s, lower %s", this.className, this.upperValue, this.middleValue, this.lowerValue)
        this.addBandwidthHistory();
    }
    addBandwidthHistory() {
        this.bandwidthHistory.push(this.getBandwidth());
        if (this.bandwidthHistory.length > this.params.bandwidthHistoryLen)
            this.bandwidthHistory.shift();
    }
}
exports.default = BollingerBands;
exports.BollingerBands = BollingerBands;
