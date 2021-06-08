import fs from 'fs'
import { Duplex, pipeline, Readable, Stream, Transform, Writable } from 'stream';
import getHistory from './history'
const tickers = ['CAT', 'QCOM', 'ADSK', 'VCEL', 'AMED', 'MELI', 'AXON', 'SGEN', 'ADBE', 'ARWR']
import { connect as dbconnect } from './db'
import createGeneratorsTest from './tickers/backtest';
import createRTGenerators from './tickers/tink';
import { Candle } from '@tinkoff/invest-openapi-js-sdk';
import Websocket from 'ws'
import { createStore, insertCandle, insertCandle as storeInsertCandle } from './store';
import { mapCandle } from './api';
import { promisify } from 'util';
var talib = require('talib/build/Release/talib')

const backtestMode = true;
const initialTake = 30
const mapTickerFigi = {}
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
            let dataByTicker = tickers.reduce((dataByTicker, ticker) => {
                try {
                    const file = fs.readFileSync(`./data/${ticker.toLowerCase()}.json`, { encoding: 'utf-8' })
                    const json = JSON.parse(file).payload.candles;
                    dataByTicker[ticker] = json;
                    // hack
                    mapTickerFigi[json[0].figi] = ticker;
                } catch(e){} finally {
                    return dataByTicker;
                }

            }, {});
            const historyDataByTicker = Object.keys(dataByTicker).reduce((historyDataByTicker, ticker)=>{
                historyDataByTicker[ticker] = dataByTicker[ticker].slice(0, initialTake);
                return historyDataByTicker;
            },{})
            Object.keys(dataByTicker).forEach(ticker => dataByTicker[ticker] = dataByTicker[ticker].slice(initialTake))
            const generatorsTest = createGeneratorsTest(Object.values(dataByTicker))
            // put the history into storage but it contains raw data so we need to map it
            Object.keys(historyDataByTicker).forEach(ticker => {
                historyDataByTicker[ticker].forEach(rawCandle => {
                        const mCandle = mapCandle(ticker, rawCandle)
                        insertCandle(store, mCandle)
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
            //TODO put mapTickerFigi into the store and use the store in the cache and then use a cache in order to get ticker name
            const mCandle = mapCandle(mapTickerFigi[candle.figi], candle);
            storeInsertCandle(store, mCandle);
            const marketData = store[mapTickerFigi[candle.figi]]['1min']
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
            // shouldn't be errors unless data is valid. Check data instead
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
    streamCandles(process.stdout)

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