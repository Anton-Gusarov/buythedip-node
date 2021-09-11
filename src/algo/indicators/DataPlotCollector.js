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
exports.DataPlotCollector = exports.PlotMarkMap = void 0;
const utils = __importStar(require("@ekliptor/apputils"));
const logger = utils.logger, nconf = utils.nconf;
class PlotMarkMap extends Map {
    constructor() {
        super();
    }
}
exports.PlotMarkMap = PlotMarkMap;
/**
 * A class representing data to be plotted on the x-y price-time diagram.
 * AbstractStrategy and AbstractIndicator instances can collect such data.
 * Only the main strategy will be plotted. The keys for the main strategy + indicators get merged and
 * returned in getPlotData()
 */
class DataPlotCollector {
    constructor() {
        this.marketTime = null;
        this.avgMarketPrice = -1;
        this.marks = new PlotMarkMap();
        this.className = this.constructor.name;
    }
    getMarkKeys() {
        let keys = [];
        for (let mark of this.marks)
            keys.push(mark[0]);
        return keys;
    }
    getMarkData(key) {
        return this.marks.get(key);
    }
    sync(candle, avgMarketPrice) {
        this.marketTime = candle.start;
        if (this.marketTime && this.marketTime.getTime() > Date.now())
            this.marketTime = new Date(); // shouldn't happen // TODO why?
        this.avgMarketPrice = avgMarketPrice;
    }
    plotMark(mark, secondaryY = false, dots = false) {
        if (nconf.get('trader') !== "Backtester") // TODO plot on website in live mode
            return;
        for (let key in mark) {
            let markData = this.marks.get(key);
            if (!markData)
                markData = [];
            markData.push({
                date: this.marketTime,
                value: mark[key],
                secondaryY: secondaryY,
                dots: dots
            });
            this.marks.set(key, markData);
        }
    }
    mergeMarkData(plotData) {
        let merged = new DataPlotCollector();
        [this, plotData].forEach((plot) => {
            //let keys = plot.getMarkKeys();
            merged.addMarks(plot.marks);
        });
        return merged;
    }
    // ################################################################
    // ###################### PRIVATE FUNCTIONS #######################
    addMarks(marks) {
        for (let mark of marks)
            this.marks.set(mark[0], mark[1]);
    }
}
exports.DataPlotCollector = DataPlotCollector;
