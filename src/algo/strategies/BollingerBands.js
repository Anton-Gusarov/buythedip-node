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
const utils = __importStar(require("@ekliptor/apputils"));
const logger = utils.logger, nconf = utils.nconf;
const TechnicalStrategy_1 = require("./TechnicalStrategy");
/**
 * Strategy that emits buy/sell based on the Bollinger Bands indicator.
 * Our assumption is that the price will always jump between the upper and lower band (as in a sideways market).
 * Consequently, at the upper we sell and at the lower band we buy.
 * If the price stays at the upper/lower band for "breakout" candles, we assume this breakout will continue.
 *
 * 2h candles + 20 SMA good: https://steemit.com/cryptocurrency/@kjnk/was-this-insider-trading
 */
class BollingerBands extends TechnicalStrategy_1.TechnicalStrategy {
    constructor(options) {
        super(options);
        this.breakoutCount = 0;
        this.addIndicator("BollingerBands", "BollingerBands", this.action);
        // TODO could we use 2 boilinger bands: 1 with candle high for the upper band and 1 with candle low for the lower band?
        if (typeof this.action.breakout !== "number")
            this.action.breakout = 0;
        if (!this.action.percentBThreshold)
            this.action.percentBThreshold = BollingerBands.PERCENT_B_THRESHOLD;
        this.addInfoFunction("breakout", () => {
            return this.action.breakout;
        });
        this.addInfoFunction("N", () => {
            return this.action.N;
        });
        this.addInfoFunction("K", () => {
            return this.action.K;
        });
        this.addInfoFunction("MAType", () => {
            return this.action.MAType;
        });
        const bollinger = this.getBollinger("BollingerBands");
        this.addInfoFunction("percentB", () => {
            if (!this.candle)
                return -1;
            return bollinger.getPercentB(this.candle.close);
        });
        this.addInfoFunction("Bandwidth", () => {
            return bollinger.getBandwidth();
        });
        this.addInfoFunction("BandwidthAvgFactor", () => {
            return bollinger.getBandwidthAvgFactor();
        });
        this.addInfoFunction("upperValue", () => {
            return bollinger.getUpperValue();
        });
        this.addInfoFunction("middleValue", () => {
            return bollinger.getMiddleValue();
        });
        this.addInfoFunction("lowerValue", () => {
            return bollinger.getLowerValue();
        });
    }
    // ################################################################
    // ###################### PRIVATE FUNCTIONS #######################
    checkIndicators() {
        const bollinger = this.getBollinger("BollingerBands");
        const value = bollinger.getPercentB(this.candle.close);
        // TODO check for this.action.thresholds.persistence, add a counter
        if (value === Number.POSITIVE_INFINITY || value === Number.NEGATIVE_INFINITY) {
            this.log("fast moving market (consider increasing candleSize), no trend detected, percent b value", value);
            this.breakoutCount = 0;
            this.lastTrend = "none";
        }
        else if (value >= 1 - this.action.percentBThreshold) {
            this.breakoutCount++;
            if (this.lastTrend === "down" && this.breakoutCount >= this.action.breakout) {
                this.log("Breakout on upper band, UP trend continuing, value", value);
                this.emitBuy(this.defaultWeight, "percent b value: " + value);
                this.setTrend("up");
            }
            // TODO only if breakoutCount <= 1? otherwise wait until count reset == no trend while the market turns
            // %b will decrease gradually, so we will then skip the next down trend
            else {
                this.log("reached upper band, DOWN trend imminent, value", value);
                this.emitSell(this.defaultWeight, "percent b value: " + value);
                this.setTrend("down");
            }
        }
        else if (value <= this.action.percentBThreshold) {
            this.breakoutCount++;
            if (this.lastTrend === "up" && this.breakoutCount >= this.action.breakout) {
                this.log("Breakout on lower band, DOWN trend continuing, value", value);
                this.emitSell(this.defaultWeight, "percent b value: " + value);
                this.setTrend("down");
            }
            else {
                this.log("reached lower band, UP trend imminent, value", value);
                this.emitBuy(this.defaultWeight, "percent b value: " + value);
                this.setTrend("up");
            }
        }
        else {
            this.log("no trend detected, percent b value", value);
            //this.breakoutCount = 0; // reset only if trend direction changes
        }
    }
    setTrend(trend) {
        if (this.lastTrend !== trend)
            this.breakoutCount = 0;
        this.lastTrend = trend;
    }
    resetValues() {
        this.breakoutCount = 0;
        super.resetValues();
    }
}
exports.default = BollingerBands;
BollingerBands.PERCENT_B_THRESHOLD = 0.0;
