import { LessThan, LessThanOrEqual } from "typeorm";
import { CMO } from "../algo";
import { Candle } from "../api";
import { getCandleRepository } from "../db/sqlite";
import { Intervals } from "../store";
// for visual backtesting
function delay() {
  return new Promise((res) => setTimeout(res, 1000));
}
// no need anymore but here for future ideas
async function* genrator1min() {
  const db = getCandleRepository();
  while (true) {
    const candles: Candle[] = await db.find({
      interval: Intervals.MIN1,
      // :(
      time: yield,
    });
    yield candles;
  }
}

export default async function* mainGenerator(
  start_ts: number,
  tickers: string[]
): AsyncGenerator<Candle[]> {
  const db = getCandleRepository();
  let ts = (
    await db.findOne({
      where: {
        time: LessThanOrEqual(start_ts),
      },
      order: {
        time: "DESC",
      },
    })
  ).time;
  while (true) {
    // get all sorts of candles for this ts. ts is descrete based on minute
    let allCandles: Candle[] = await Promise.all(
      // tickers array
      tickers.map(async (ticker) => {
        // candles array
        const candle = await db.findOne({
          time: ts,
          interval: Intervals.MIN1,
          ticker,
        });
        if (!candle) return null;
        // convience first
        const history3min = await db.find({
          where: {
            time: LessThan(ts),
            interval: Intervals.MIN3,
            ticker,
          },
          order: { time: "ASC" },
        });
        const history5min = await db.find({
          where: {
            time: LessThan(ts),
            interval: Intervals.MIN5,
            ticker,
          },
          order: { time: "ASC" },
        });
        const history15min = await db.find({
          where: {
            time: LessThan(ts),
            interval: Intervals.MIN15,
            ticker,
          },
          order: { time: "ASC" },
        });
        const cmo3 = (
          await CMO({ close: history3min.map((v) => v.close) }, candle)
        ).result.outReal.pop();
        const cmo5 = (
          await CMO({ close: history5min.map((v) => v.close) }, candle)
        ).result.outReal.pop();
        const cmo15 = (
          await CMO({ close: history15min.map((v) => v.close) }, candle)
        ).result.outReal.pop();
        const modifiedCandle: Candle = {
          ...candle,
          cmo3,
          cmo5,
          cmo15,
        };
        return modifiedCandle;
      })
    );
    allCandles = allCandles.filter((v) => v);
    ts += 60000; // 1min
    if (!allCandles.length) continue;
    yield allCandles;
    await delay();
    // const pause = yield;
    // if (pause) yield; // for future feature play/pause
  }
}
