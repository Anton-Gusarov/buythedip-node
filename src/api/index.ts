import {
  mapInterval as mapIntervalT,
  mapCandle as mapCandleT,
  mapIntervalFrom as mapIntervalFromT,
} from "./tink";
export type Candle = {
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  time: number;
  interval: string;
  ticker: string;
  cmo3?: number;
  cmo5?: number;
  cmo15?: number;
};
// improve after second provider added
export function mapInterval(v) {
  return mapIntervalT(v);
}
export function mapIntervalFrom(v) {
  return mapIntervalFromT(v);
}

export function mapCandle(ticker, candleIn) {
  const newCandle = mapCandleT(ticker, candleIn);
  return newCandle;
}
