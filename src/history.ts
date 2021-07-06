import api from "./api/tink";
import { Candles, CandleResolution } from "@tinkoff/invest-openapi-js-sdk";
import db from "./db/sqlite";
import { getCachedFigi, getTickerByFIGI } from "./cache/cache";
import { Intervals } from "./store";
import { mapCandle } from "./api";

type HistoryOptions = {
  interval?: Intervals;
  toTime?: Date;
  fromTime?: Date | null;
};

export default async function getHistory(
  ticker: string,
  {
    interval = Intervals.MIN1,
    toTime = new Date(Date.now()),
    fromTime = null,
  }: HistoryOptions = {}
) {
  // let {interval, fromTime, toTime} = options
  const figi = await getCachedFigi(ticker).catch(console.error);
  // - 2 hours
  if (!fromTime) {
    fromTime = new Date(toTime);
    fromTime.setUTCHours(toTime.getUTCHours() - 2);
  }
  let candles: Candles;
  try {
    candles = await api.candlesGet({
      from: fromTime.toISOString(),
      to: toTime.toISOString(),
      figi,
      interval: interval as CandleResolution,
    });
  } catch (e) {
    console.error(e);
    return [];
  }
  return candles.candles.map((candle) =>
    mapCandle(getTickerByFIGI(candle.figi), candle)
  );
}
