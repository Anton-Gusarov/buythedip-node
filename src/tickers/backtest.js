"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const algo_1 = require("../algo");
const sqlite_1 = require("../db/sqlite");
const store_1 = require("../store");
const twoHours = 1000 * 60 * 60 * 2;
// for visual backtesting
function delay() {
    return new Promise((res) => setTimeout(res, 3000));
}
// no need anymore but here for future ideas
async function* genrator1min() {
    const db = (0, sqlite_1.getCandleRepository)();
    while (true) {
        const candles = await db.find({
            interval: store_1.Intervals.MIN1,
            // :(
            time: yield,
        });
        yield candles;
    }
}
function getIndicators(history, computedHistory) {
    const reversedIndexMax = computedHistory.length -
        computedHistory.lastIndexOf(Math.max(...computedHistory));
    const reversedIndexMin = computedHistory.length -
        computedHistory.lastIndexOf(Math.min(...computedHistory));
    // array.at is not here...
    const maxTime = history[history.length - reversedIndexMax].time;
    const maxPrice = history[history.length - reversedIndexMax].close;
    const minTime = history[history.length - reversedIndexMin].time;
    const minPrice = history[history.length - reversedIndexMin].close;
    return {
        maxTime,
        maxPrice,
        minTime,
        minPrice,
    };
}
async function* mainGenerator(start_ts, tickers) {
    const db = (0, sqlite_1.getCandleRepository)();
    let ts = (await db.findOne({
        where: {
            time: (0, typeorm_1.LessThanOrEqual)(start_ts),
        },
        order: {
            time: "DESC",
        },
    })).time;
    while (true) {
        // get all sorts of candles for this ts. ts is descrete based on minute
        let allCandles = await Promise.all(
        // tickers array
        tickers.map(async (ticker) => {
            // candles array
            const candle = await db.findOne({
                time: ts,
                interval: store_1.Intervals.MIN1,
                ticker,
            });
            if (!candle)
                return null;
            // convience first
            const history3min = await db.find({
                where: {
                    time: (0, typeorm_1.LessThan)(ts),
                    interval: store_1.Intervals.MIN3,
                    ticker,
                },
                order: { time: "ASC" },
            });
            const history3minMaxminLength = (await db.find({
                where: {
                    time: (0, typeorm_1.Between)(ts - twoHours, ts),
                    interval: store_1.Intervals.MIN3,
                    ticker,
                },
                order: { time: "ASC" },
            })).length;
            const history5min = await db.find({
                where: {
                    time: (0, typeorm_1.LessThan)(ts),
                    interval: store_1.Intervals.MIN5,
                    ticker,
                },
                order: { time: "ASC" },
            });
            const history15min = await db.find({
                where: {
                    time: (0, typeorm_1.LessThan)(ts),
                    interval: store_1.Intervals.MIN15,
                    ticker,
                },
                order: { time: "ASC" },
            });
            const cmo3 = (await (0, algo_1.CMO)({ close: history3min.map((v) => v.close) }, candle)).result.outReal;
            const cmo3Slice = cmo3.slice(-history3minMaxminLength);
            const cmo3Mixin = getIndicators(history3min, cmo3Slice);
            const indicators = [];
            indicators.push({
                type: "cmo3",
                value: cmo3.pop(),
                ...cmo3Mixin,
            });
            const cmo5 = (await (0, algo_1.CMO)({ close: history5min.map((v) => v.close) }, candle)).result.outReal;
            const cmo15 = (await (0, algo_1.CMO)({ close: history15min.map((v) => v.close) }, candle)).result.outReal;
            const modifiedCandle = {
                ...candle,
                indicators,
            };
            return modifiedCandle;
        }));
        allCandles = allCandles.filter((v) => v);
        ts += 60000; // 1min
        if (!allCandles.length)
            continue;
        yield allCandles;
        await delay();
        // const pause = yield;
        // if (pause) yield; // for future feature play/pause
    }
}
exports.default = mainGenerator;
