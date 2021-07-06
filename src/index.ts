import {
  Duplex,
  pipeline,
  Readable,
  Stream,
  Transform,
  Writable,
} from "stream";
import "reflect-metadata";
import getHistory from "./history";
// const tickers = ['CAT', 'QCOM', 'ADSK', 'VCEL', 'AMED', 'MELI', 'AXON', 'SGEN', 'ADBE', 'ARWR']
const tickers = ["CAT"];
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
import { CandleDB } from "./entity/Candle";
import { getRepository, MoreThan } from "typeorm";
import sqliteConnect, { getCandleRepository } from "./db/sqlite";
import { connect as mongoConnect } from "./db/mongo";
var talib = require("talib/build/Release/talib");
type BacktestHistory = Candle[][][];
const backtestMode = true;
// maybe use some ramda
const store = createStore(tickers);

(async () => {
  await mongoConnect(config.get("mongodbUri"));
  await sqliteConnect();
  const candlesRepository = getCandleRepository();
  const generators = await (async () => {
    // split into modules for now but later refacrtor it into hierarchical way, that is RT is always present but backtest is on top
    if (backtestMode) {
      // will be removed after file reading is abandoned and switched to online data
      // convert date to timestamp and figure out how to manage it. sqlite doesn't support date and typeorm doesnt manage it
      const middleDate = new Date("2021-05-05T11:40:00Z"),
        toTime = new Date(middleDate),
        middleDateAnd1Sec = new Date(middleDate),
        fromTime = new Date(middleDate);
      toTime.setUTCHours(middleDate.getUTCHours() + 2);
      fromTime.setUTCHours(middleDate.getUTCHours() - 22);
      middleDateAnd1Sec.setUTCSeconds(middleDate.getUTCSeconds() + 1);
      // constrains 100 requessts per 1 min
      const backtestHistory: Candle[] = (
        (await Promise.all(
          // intervals array
          // no need to flatten array they are all simultanious
          Object.keys(Intervals).map((intervalKey) =>
            // tickers array
            Promise.all(
              tickers.map((ticker) =>
                // candles array
                getHistory(ticker, {
                  toTime,
                  fromTime,
                  interval: Intervals[intervalKey],
                })
              )
            )
          )
        )) as BacktestHistory
      ).flat(2);
      await candlesRepository.insert(backtestHistory);
      const backtestFutures = await Promise.all(
        tickers.map((ticker) => {
          // convenience first
          return candlesRepository.find({
            where: {
              interval: Intervals.MIN1,
              ticker,
              // :(
              time: MoreThan(middleDate),
            },
            order: {
              time: "ASC",
            },
          });
        })
      );
      // TODO change generators to operate by time not by candles and serve candles for a particular minute
      const generatorsTest = createGeneratorsTest(backtestFutures);

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
// "typeorm": "0.2.34",
// "reflect-metadata": "^0.1.10",
// "sqlite3": "^4.0.3"
