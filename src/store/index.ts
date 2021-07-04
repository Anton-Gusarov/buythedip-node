import { Candle, mapInterval } from "../api";

export enum Intervals {
  MIN1 = "1min",
  MIN3 = "3min",
  MIN5 = "5min",
  MIN15 = "15min",
  DAY1 = "day",
}
export enum Indicators {
  OPEN = "open",
  CLOSE = "close",
  HIGH = "high",
  LOW = "low",
  VOLUME = "volume",
}
// store = {
//   'CAT': [
//     '1min': Candle[],
//     '3min': Candle[],
//     ...
//   ],
//   'ARWR': [
//     '1min': Candle[],
//     '3min': Candle[],
//     ...
//   ],
// }
export type MarketData = {
  [key in Indicators]: Number[];
};
export type TickerHistoryStore = {
  [key in Intervals]: MarketData;
};
export type Store = {
  [tickers: string]: TickerHistoryStore;
};
const createTickerFormat = () => {
  const result = {};
  for (const key in Indicators) result[Indicators[key]] = [];
  return result;
};
const createTickerBase = () => {
  const result = {};
  for (const key in Intervals) result[Intervals[key]] = createTickerFormat();
  return result;
};
export function createStore(tickers) {
  return tickers.reduce((store, ticker) => {
    store[ticker] = createTickerBase();
    return store;
  }, {});
}
export function insertToMarketData(marketData: MarketData, candle: Candle) {
  for (const key in Indicators)
    marketData[Indicators[key]].push(candle[Indicators[key]]);
}
export function insertCandle(store: Store, candle: Candle) {
  try {
    const marketData: MarketData = store[candle.ticker][candle.interval];
    insertToMarketData(marketData, candle);
  } catch (error) {
    debugger;
  }
}
