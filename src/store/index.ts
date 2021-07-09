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
export type MarketData = {
  [key in Indicators]?: Number[];
};
