import {
  Duplex,
  pipeline,
  Readable,
  Stream,
  Transform,
  Writable,
} from "stream";

import getHistory from "./history";
// const tickers = ['CAT', 'QCOM', 'ADSK', 'VCEL', 'AMED', 'MELI', 'AXON', 'SGEN', 'ADBE', 'ARWR']
const tickers = ["CAT"];

import { connect as dbconnect } from "./db";
import createGeneratorsTest from "./tickers/backtest";
import createRTGenerators from "./tickers/tink";
import Websocket from "ws";
import {
  createStore,
  insertCandle as storeInsertCandle,
  Intervals,
} from "./store";
import { Candle, mapCandle } from "./api";
import { promisify } from "util";
import { ArrayToMap, concatGenerators } from "./utils";
import { getTickerByFIGI } from "./cache/cache";
import config from "config";
import { CMO } from "./algo";
var talib = require("talib/build/Release/talib");
type BacktestHistory = Candle[][][];
const backtestMode = true;
// maybe use some ramda
const store = createStore(tickers);

(async () => {
  await dbconnect(config.get("mongodbUri"));
  const generators = await (async () => {
    // split into modules for now but later refacrtor it into hierarchical way, that is RT is always present but backtest is on top
    if (backtestMode) {
      // will be removed after file reading is abandoned and switched to online data
      // todo ramda
      const middleDate = new Date("2021-05-05T11:40:00Z"),
        toTime = new Date(middleDate),
        middleDateAnd1Sec = new Date(middleDate),
        fromTime = new Date(middleDate);
      toTime.setUTCHours(middleDate.getUTCHours() + 2);
      fromTime.setUTCHours(middleDate.getUTCHours() - 22);
      middleDateAnd1Sec.setUTCSeconds(middleDate.getUTCSeconds() + 1);
      // don't want to split backtest data so make two requests
      // constrains 100 requessts per 1 min
      const backtestHistory: BacktestHistory = await Promise.all(
        // intervals array
        Object.keys(Intervals).map((intervalKey) =>
          // tickers array
          Promise.all(
            tickers.map((ticker) =>
              // candles array
              getHistory(ticker, {
                toTime: middleDate,
                fromTime,
                interval: Intervals[intervalKey],
              })
            )
          )
        )
      );

      //TODO grab all candles for all tickers and then sort them all by date.
      // only 1 min for now
      const backtestFutures = await Promise.all(
        tickers.map((ticker) =>
          getHistory(ticker, { toTime, fromTime: middleDateAnd1Sec })
        )
      );

      // TODO change generators to operate by time not by candles and serve candles for a particular minute
      const generatorsTest = createGeneratorsTest(backtestFutures);
      // put the history into storage. We can do it only here not above
      //TODO ramda
      backtestHistory.forEach((intervalHistory) => {
        intervalHistory.forEach((tickerHistory) => {
          tickerHistory.forEach((candle) => {
            storeInsertCandle(store, candle);
          });
        });
      });

      return generatorsTest;
    } else {
      // perhaps we'll need concurrency in order to limit requests amount
      //TODO make mapping inside
      const historyDatas = await Promise.all(
        tickers.map((ticker) => getHistory(ticker))
      );
      const generatorsRT = await createRTGenerators(tickers);
      return tickers.map((_, idx) => {
        return concatGenerators(historyDatas[idx], generatorsRT[idx]);
      });
    }
  })();
  // separate stream for a ticker or all in one?
  // create transform stream here to apply the map
  const allStreams = generators.map((gen) =>
    Readable.from(gen).pipe(
      new Transform({
        transform(candle, encoding, next) {
          storeInsertCandle(store, candle);
          let finalCandle = candle;
          Promise.all([
            CMO(store[candle.ticker][Intervals.MIN3], candle).then(
              (res: any) => {
                finalCandle = {
                  ...finalCandle,
                  cmo3: res.result.outReal.pop(),
                };
              }
            ),
            CMO(store[candle.ticker][Intervals.MIN5], candle).then(
              (res: any) => {
                finalCandle = {
                  ...finalCandle,
                  cmo5: res.result.outReal.pop(),
                };
              }
            ),
            CMO(store[candle.ticker][Intervals.MIN15], candle).then(
              (res: any) => {
                finalCandle = {
                  ...finalCandle,
                  cmo15: res.result.outReal.pop(),
                };
              }
            ),
          ]).then(() => {
            this.push(finalCandle);
            next();
          });
        },
        objectMode: true,
      })
    )
  );
  let counter = 0;
  // empty writable. This will be unnesessary
  const emptyStream = new Writable({
    write(chunk, enc, next) {
      counter++;
      next();
    },
    objectMode: true,
  });
  if (!backtestMode) streamCandles(process.stdout);

  // At least one client should connect only after that it starts streaming, unless it accumulates beforehand
  function streamCandles(call: Writable) {
    // Assumed we have a client instantly
    // highly recommend to use pipe
    allStreams.forEach((stream) =>
      pipeline(stream, call, (err) => {
        console.log(err);
      })
    );
  }
  const wss = new Websocket.Server({ port: 8080 });

  wss.on("connection", function connection(ws: Websocket) {
    const client = Websocket.createWebSocketStream(ws);
    allStreams.forEach((stream) =>
      stream
        .pipe(
          new Transform({
            transform(candle, encoding, next) {
              this.push(JSON.stringify(candle));
              next();
            },
            objectMode: true,
          })
        )
        .pipe(client)
    );
  });
  //check if it is necessary
  process.on("exit", (code) => {
    wss.clients.forEach((socket) => {
      socket.close();
    });
  });
})();
