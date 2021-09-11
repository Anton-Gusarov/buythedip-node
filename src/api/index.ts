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
};

export interface CMOIndicator extends CandleOutputIndicators {
  value: number;
  maxTime: number;
  maxPrice: number;
  minTime: number;
  minPrice: number;
}
export interface CandleOutputIndicators {
  type: string;
}
export interface CandleOutput extends Candle {
  indicators: CandleOutputIndicators[];
}
interface CandleOutputTodo {
  type: "candle"; // needed to distinguish ws events
  payload: CandleOutput;
}
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
