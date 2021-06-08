import { mapInterval as mapIntervalT, mapCandle as mapCandleT } from "./tink";
export type Candle = {
    open: Number,
    close: Number,
    high: Number,
    low: Number,
    volume: Number,
    time: string,
    interval: string,
    ticker: string
}
// improve after second provider added
export function mapInterval(v) {
    return mapIntervalT(v);
}

export function mapCandle(ticker, candleIn) {
    const newCandle = mapCandleT(ticker, candleIn);
    return newCandle;
}