import fs from 'fs'
import { Duplex, pipeline, Readable, Stream, Transform, Writable } from 'stream';
import getHistory from './history'
// const tickers = ['CAT', 'QCOM', 'ADSK', 'VCEL', 'AMED', 'MELI', 'AXON', 'SGEN', 'ADBE', 'ARWR']
const tickers = ['CAT']
import { connect as dbconnect } from './db'
import createGeneratorsTest from './tickers/backtest';
import createRTGenerators from './tickers/tink';
import { Candle } from '@tinkoff/invest-openapi-js-sdk';
import Websocket from 'ws'
import { createStore, insertCandle as storeInsertCandle, Intervals } from './store';
import { mapCandle } from './api';
import { promisify } from 'util';
import { ArrayToMap } from './utils';
import { getTickerByFIGI } from './cache/cache';
var talib = require('talib/build/Release/talib')

const backtestMode = true;
// maybe use some ramda
const store = createStore(tickers)
async function* concatGenerators(...generators) {
    for (const gen of generators) {
        yield* gen
    }
}
(async () => {
    await dbconnect()
    const generators = await (async () => {
        // split into modules for now but later refacrtor it into hierarchical way, that is RT is always present but backtest is on top 
        if (backtestMode) {
            // will be removed after file reading is abandoned and switched to online data 
            // todo ramda
            const middleDate = new Date('2021-05-05T11:40:00Z'),
            toTime = new Date(middleDate),
            middleDateAnd1Sec = new Date(middleDate),
            fromTime = new Date(middleDate);
            toTime.setUTCHours(middleDate.getUTCHours() + 1)
            fromTime.setUTCHours(middleDate.getUTCHours() - 3)
            middleDateAnd1Sec.setUTCSeconds(middleDate.getUTCSeconds() + 1)
            // don't want to split backtest data so make two requests
            // change intervals to all but 1min FIRST!
            const backtestHistory = await Promise.all(tickers.map(ticker => getHistory(ticker, {toTime: middleDate, fromTime})));
            const backtestFutures = await Promise.all(tickers.map(ticker => getHistory(ticker, {toTime, fromTime: middleDateAnd1Sec})));

            const backtestHistoryByTicker = ArrayToMap(tickers, backtestHistory);
            const backtestFuturesByTicker = ArrayToMap(tickers, backtestFutures);

            const generatorsTest = createGeneratorsTest(backtestFutures)
            // put the history into storage but it contains raw data so we need to map it
            Object.keys(backtestHistoryByTicker).forEach(ticker => {
                backtestHistoryByTicker[ticker].forEach(rawCandle => {
                        const mCandle = mapCandle(ticker, rawCandle)
                        storeInsertCandle(store, mCandle)
                });
            });

            return generatorsTest
        } else {
            // perhaps we'll need concurrency in order to limit requests amount
            const historyDatas = await Promise.all(tickers.map(ticker => getHistory(ticker)))
            const generatorsRT = await createRTGenerators(tickers)
            return tickers.map((_, idx) => {
                return concatGenerators(historyDatas[idx], generatorsRT[idx])
            })
        }
    })()
    // separate stream for a ticker or all in one?
    // create transform stream here to apply the map
    const allStreams = generators.map(gen => Readable.from(gen).pipe(new Transform({
        transform(candle: Candle, encoding, next) {
            
            const mCandle = mapCandle(getTickerByFIGI(candle.figi), candle);
            storeInsertCandle(store, mCandle);
            // Calc for different intervals and give them all at 1min SECOND!!
            const marketData = store[getTickerByFIGI(candle.figi)][Intervals.MIN1]
            //TODO to different module
            talib.execute({
                name: "CMO",
                startIdx: 0,
                endIdx: marketData.close.length - 1,
                // high: marketData.high,
                // low: marketData.low,
                inReal: marketData.close,
                optInTimePeriod: 20
            }, 
            // shouldn't be any errors unless data is valid. Check data instead
            (err, res)=>{
                if(err) debugger
                // no need to keep indicators in store for now
                this.push({
                    ...mCandle,
                    cmo: res.result.outReal.pop()
                });
                next()
            });
        },
        objectMode: true
    })))
    let counter = 0
    // empty writable. This will be unnesessary
    const emptyStream = new Writable({
        write(chunk, enc, next) {
            counter++;
            next()
        },
        objectMode: true
    });
    if (!backtestMode) streamCandles(process.stdout)

    // At least one client should connect only after that it starts streaming, unless it accumulates beforehand
    function streamCandles(call: Writable) {
        // Assumed we have a client instantly
        // highly recommend to use pipe
        allStreams.forEach(stream => pipeline(stream, call, (err) => { console.log(err); }))
    }
    const wss = new Websocket.Server({ port: 8080 });

    wss.on('connection', function connection(ws: Websocket) {
        const client = Websocket.createWebSocketStream(ws);
        allStreams.forEach(stream => stream
            .pipe(new Transform({
                transform(candle, encoding, next) {
                    this.push(JSON.stringify(candle));
                    next()
                },
                objectMode: true
            }))
            .pipe(client)
        )
    });
    //check if it is necessary
    process.on('exit', (code) => {
        wss.clients.forEach((socket) => {
            socket.close();
        });
    });
})()