import { Between, LessThan, LessThanOrEqual } from "typeorm";
import { CMO } from "../algo";
import {
  Candle,
  CandleOutput,
  CandleOutputIndicators,
  CMOIndicator,
} from "../api";
import { getCandleRepository } from "../db/sqlite";
import { Intervals } from "../store";
interface indicatorsMixin {
  maxTime: number;
  maxPrice: number;
  minTime: number;
  minPrice: number;
  minValue: number;
  maxValue: number;
}
const twoHours = 1000 * 60 * 60 * 2;
// for visual backtesting
function delay() {
  return new Promise((res) => setTimeout(res, 3000));
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
function getIndicators(history, indicatorHistory): indicatorsMixin {
  const maxValue = Math.max(...indicatorHistory);
  const minValue = Math.min(...indicatorHistory);
  const reversedIndexMax =
    indicatorHistory.length - indicatorHistory.lastIndexOf(maxValue);
  const reversedIndexMin =
    indicatorHistory.length - indicatorHistory.lastIndexOf(minValue);
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
    maxValue,
    minValue,
  };
}
export default async function* mainGenerator(
  start_ts: number,
  tickers: string[]
): AsyncGenerator<CandleOutput[]> {
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
    let allCandles: CandleOutput[] = await Promise.all(
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
        const history3minMaxminLength = (
          await db.find({
            where: {
              time: Between(ts - twoHours, ts),
              interval: Intervals.MIN3,
              ticker,
            },
            order: { time: "ASC" },
          })
        ).length;
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
        ).result.outReal;
        const cmo3Slice = cmo3.slice(-history3minMaxminLength);
        const cmo3Mixin = getIndicators(history3min, cmo3Slice);
        const indicators: CandleOutputIndicators[] = [];
        indicators.push({
          type: "cmo3",
          value: cmo3.pop(),
          ...cmo3Mixin,
        } as CMOIndicator);
        const cmo5 = (
          await CMO({ close: history5min.map((v) => v.close) }, candle)
        ).result.outReal;
        const cmo15 = (
          await CMO({ close: history15min.map((v) => v.close) }, candle)
        ).result.outReal;
        const modifiedCandle: CandleOutput = {
          ...candle,
          indicators,
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
