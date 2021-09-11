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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const stream_1 = require("stream");
require("reflect-metadata");
const history_1 = __importDefault(require("./history"));
const tickers = [
    "CAT",
    // "QCOM",
    // "ADSK",
    // "VCEL",
    // "AMED",
    // "MELI",
    "AXON",
    "SGEN",
    "ADBE",
    "ARWR",
];
const tink_1 = __importDefault(require("./tickers/tink"));
const ws_1 = __importDefault(require("ws"));
const store_1 = require("./store");
const utils_1 = require("./utils");
const config_1 = __importDefault(require("config"));
const algo_1 = require("./algo");
const sqlite_1 = __importStar(require("./db/sqlite"));
const mongo_1 = require("./db/mongo");
const backtest_1 = __importDefault(require("./tickers/backtest"));
var talib = require("talib/build/Release/talib");
const backtestMode = true;
(async () => {
    await (0, mongo_1.connect)(config_1.default.get("mongodbUri"));
    await (0, sqlite_1.default)();
    const candlesRepository = (0, sqlite_1.getCandleRepository)();
    const generators = await (async () => {
        // split into modules for now but later refacrtor it into hierarchical way, that is RT is always present but backtest is on top
        if (backtestMode) {
            // sqlite doesn't support date and typeorm doesnt manage it
            // Keep Z to stay with 0 time zone
            const middleDate = new Date("2021-05-05T11:40:00Z"), toTime = new Date(middleDate), fromTime = new Date(middleDate);
            toTime.setUTCHours(middleDate.getUTCHours() + 2);
            fromTime.setUTCHours(middleDate.getUTCHours() - 22);
            // constrains 100 requessts per 1 min
            const backtestHistory = (await Promise.all(
            // intervals array
            // no need to flatten array they are all simultanious
            //TODO calculate indicators here
            Object.keys(store_1.Intervals).map((intervalKey) => 
            // tickers array
            Promise.all(tickers.map(async (ticker) => {
                // candles array
                const history = await (0, history_1.default)(ticker, {
                    toTime,
                    fromTime,
                    interval: store_1.Intervals[intervalKey],
                });
                if (intervalKey === store_1.Intervals.MIN1) {
                    return history;
                }
                // maybe remove, just commit with it
                const cmo = (await (0, algo_1.CMO)({ close: history.map((v) => v.close) }))
                    .result.outReal;
                const modifiedHistory = history.map((v, idx) => {
                    v["cmo" + store_1.Intervals[intervalKey]] = cmo[idx];
                    return v;
                });
                return modifiedHistory;
            }))))).flat(2);
            for (let index = 0; index < backtestHistory.length; index += 400) {
                await candlesRepository.insert(backtestHistory.slice(index, index + 400));
            }
            return [(0, backtest_1.default)(Number(middleDate) + 1, tickers)];
        }
        else {
            // perhaps we'll need concurrency in order to limit requests amount
            const historyDatas = await Promise.all(tickers.map((ticker) => (0, history_1.default)(ticker)));
            const generatorsRT = await (0, tink_1.default)(tickers);
            return tickers.map((_, idx) => {
                return (0, utils_1.concatGenerators)(historyDatas[idx], generatorsRT[idx]);
            });
        }
    })();
    const allStreams = generators.map((gen) => stream_1.Readable.from(gen).pipe(new stream_1.Transform({
        transform(candles, encoding, next) {
            this.push(candles);
            next();
        },
        objectMode: true,
    })));
    let counter = 0;
    // empty writable. This will be unnesessary
    const emptyStream = new stream_1.Writable({
        write(chunk, enc, next) {
            counter++;
            next();
        },
        objectMode: true,
    });
    if (!backtestMode)
        streamCandles(process.stdout);
    // At least one client should connect only after it's done it starts streaming, unless it accumulates
    function streamCandles(call) {
        // Assumed we have a client instantly
        // highly recommend to use pipe
        allStreams.forEach((stream) => (0, stream_1.pipeline)(stream, call, (err) => {
            console.log(err);
        }));
    }
    const wss = new ws_1.default.Server({ port: 8080 });
    wss.on("connection", function connection(ws) {
        const client = ws_1.default.createWebSocketStream(ws);
        allStreams.forEach((stream) => stream
            .pipe(new stream_1.Transform({
            transform(candle, encoding, next) {
                this.push(JSON.stringify(candle));
                next();
            },
            objectMode: true,
        }))
            .pipe(client));
    });
    //check if it is necessary
    process.on("exit", (code) => {
        wss.clients.forEach((socket) => {
            socket.close();
        });
    });
})();
