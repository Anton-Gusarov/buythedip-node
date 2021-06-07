import fs from 'fs'
import { Duplex, pipeline, Readable, Stream, Transform, Writable } from 'stream';
import getHistory from './history'
import api, { mapCandle, mapInterval } from './api/tink'
const tickers = ['CAT', 'QCOM', 'ADSK', 'VCEL', 'AMED', 'MELI', 'AXON', 'SGEN', 'ADBE', 'ARWR']
import { connect as dbconnect } from './db'
import db from './db'
import { grpc, candlesProto } from './api/grpc'
import createGeneratorsTest from './tickers/backtest';
import createRTGenerators from './tickers/tink';
import { Candle } from '@tinkoff/invest-openapi-js-sdk';
import Websocket from 'ws'
var talib = require('./build/Release/talib');
enum Intervals {
    MIN1 = '1min',
    MIN3 = '3min',
    MIN5 = '5min',
    MIN15 = '15min',
    DAY1 = '1day',
}
enum Indicators {
    OPEN = 'open',
    CLOSE = 'close',
    HIGH = 'high',
    LOW = 'low',
    VOLUME = 'volume',
}
const backtestMode = true;
const initialTake = 30
const mapTickerFigi = {}
// maybe use some ramda
const createTickerFormat = ()=> {
    const result = {}
    for (const key in Indicators) result[key] = []
    return result;
}
const createTickerBase = ()=>{
    const result = {}
    for (const key in Intervals) result[key] = createTickerFormat()
    return result;
}
const store = tickers.reduce((store, ticker)=>{
    store[ticker] = createTickerBase()
    return store
}, {})
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
            const activeTickers = {}
            // TODO: refactor to dicts otherwise difficult to debug
            // todo ramda
            let dataByTicker = tickers.reduce((dataByTicker, ticker) => {
                try {
                    const file = fs.readFileSync(`./data/${ticker.toLowerCase()}.json`, { encoding: 'utf-8' })
                    const json = JSON.parse(file).payload.candles;
                    dataByTicker[ticker] = json;
                    // hack
                    mapTickerFigi[json[0].figi] = ticker;
                    return dataByTicker;
                } catch (e) { 
                    return dataByTicker;
                }

            }, {});
            const historyDataByTicker = Object.keys(dataByTicker).reduce((historyDataByTicker, ticker)=>{
                historyDataByTicker[ticker] = dataByTicker[ticker].slice(0, initialTake);
                return historyDataByTicker;
            },{})
            Object.keys(dataByTicker).forEach(ticker => dataByTicker[ticker] = dataByTicker[ticker].slice(initialTake))
            const generatorsTest = createGeneratorsTest(Object.values(dataByTicker))
            // put the history into storage
            historyDataByTicker.forEach(data=>{

            })
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
            const mCandle = mapCandle(mapTickerFigi[candle.figi], candle);
            const tickerStore = store[mCandle.ticker][mapInterval(mCandle.interval)]
            for (const key in Indicators) tickerStore[key].push(candle[key]);
            store[mCandle.ticker][mapInterval(mCandle.interval)].push(mCandle);
            try {
                this.push(mCandle);
                next()
            } catch (e) {
                debugger
                console.log(e);

            }
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
    streamCandles(emptyStream)

    // At least one client should connect only after that it starts streaming, unless it accumulates beforehand
    function streamCandles(call: Writable) {
        // Assumed we have a client instantly
        // highly recommend to use pipe
        allStreams.forEach(stream => pipeline(stream, call, (err) => { console.log(err); }))
    }
    // function CandlesNearestHistory(call, callback) {
    //     // call.request
    //     callback(null, { candle: data.slice(counter, initalTake + counter) });
    // }
    // var server = new grpc.Server();
    // server.addService(candlesProto.CandleService.service, {
    //     streamCandles,
    //     // CandlesNearestHistory
    // });
    // server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
    //     server.start();
    // });
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
    process.on('exit', (code) => {
        wss.clients.forEach((socket) => {
            socket.close();
            // wont work
            process.nextTick(() => {
                if ([WebSocket.OPEN, WebSocket.CLOSING].includes(socket.readyState)) {
                    // Socket still hangs, hard close
                    socket.terminate();
                }
            });
        });
    });
})()