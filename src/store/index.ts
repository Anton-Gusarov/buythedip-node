import { Candle, mapInterval } from "../api";

enum Intervals {
    MIN1 = '1min',
    MIN3 = '3min',
    MIN5 = '5min',
    MIN15 = '15min',
    DAY1 = '1day',
}
enum Indicators {
    OPEN = 'open',
    CLOSE = 'close',
    HIGH = 'high',
    LOW = 'low',
    VOLUME = 'volume',
}
const createTickerFormat = ()=> {
    const result = {}
    for (const key in Indicators) result[Indicators[key]] = []
    return result;
}
const createTickerBase = ()=>{
    const result = {}
    for (const key in Intervals) result[Intervals[key]] = createTickerFormat()
    return result;
}
export function createStore(tickers) {
    return tickers.reduce((store, ticker)=>{
        store[ticker] = createTickerBase()
        return store
    }, {})
}
export function insertCandle(store, candle: Candle) {
    const tickerStore = store[candle.ticker][mapInterval(candle.interval)]
    for (const key in Indicators) tickerStore[Indicators[key]].push(candle[Indicators[key]]);
}