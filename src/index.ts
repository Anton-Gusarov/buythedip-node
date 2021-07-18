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
const tickers = [
  "CAT",
  "QCOM",
  "ADSK",
  "VCEL",
  "AMED",
  "MELI",
  "AXON",
  "SGEN",
  "ADBE",
  "ARWR",
];
// const tickers = ["CAT"];
import createGeneratorsTest from "./tickers/backtest";
import createRTGenerators from "./tickers/tink";
import Websocket from "ws";
import { Intervals } from "./store";
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
import mainGenerator from "./tickers/backtest";
var talib = require("talib/build/Release/talib");
type BacktestHistory = Candle[][][];
const backtestMode = true;

(async () => {
  await mongoConnect(config.get("mongodbUri"));
  await sqliteConnect();
  const candlesRepository = getCandleRepository();
  const generators = await (async () => {
    // split into modules for now but later refacrtor it into hierarchical way, that is RT is always present but backtest is on top
    if (backtestMode) {
      // sqlite doesn't support date and typeorm doesnt manage it
      // Keep Z to stay with 0 time zone
      const middleDate = new Date("2021-05-05T11:40:00Z"),
        toTime = new Date(middleDate),
        fromTime = new Date(middleDate);
      toTime.setUTCHours(middleDate.getUTCHours() + 2);
      fromTime.setUTCHours(middleDate.getUTCHours() - 22);
      // constrains 100 requessts per 1 min
      const backtestHistory: Candle[] = (
        (await Promise.all(
          // intervals array
          // no need to flatten array they are all simultanious
          //TODO calculate indicators here
          Object.keys(Intervals).map((intervalKey) =>
            // tickers array
            Promise.all(
              tickers.map(async (ticker) => {
                // candles array
                const history = await getHistory(ticker, {
                  toTime,
                  fromTime,
                  interval: Intervals[intervalKey],
                });
                if (intervalKey === Intervals.MIN1) {
                  return history;
                }
                // maybe remove, just commit with it
                const cmo = (await CMO({ close: history.map((v) => v.close) }))
                  .result.outReal;
                const modifiedHistory = history.map((v: Candle, idx) => {
                  v["cmo" + Intervals[intervalKey]] = cmo[idx];
                  return v;
                });
                return modifiedHistory;
              })
            )
          )
        )) as BacktestHistory
      ).flat(2);
      for (let index = 0; index < backtestHistory.length; index += 400) {
        await candlesRepository.insert(
          backtestHistory.slice(index, index + 400)
        );
      }

      return [mainGenerator(Number(middleDate) + 1, tickers)];
    } else {
      // perhaps we'll need concurrency in order to limit requests amount
      const historyDatas = await Promise.all(
        tickers.map((ticker) => getHistory(ticker))
      );
      const generatorsRT = await createRTGenerators(tickers);
      return tickers.map((_, idx) => {
        return concatGenerators(historyDatas[idx], generatorsRT[idx]);
      });
    }
  })();
  const allStreams = generators.map((gen) =>
    Readable.from(gen).pipe(
      new Transform({
        transform(candles, encoding, next) {
          this.push(candles);
          next();
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

  // At least one client should connect only after it's done it starts streaming, unless it accumulates
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
