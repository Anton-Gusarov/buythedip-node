import OpenAPI, {
  Candle,
  MarketInstrument,
} from "@tinkoff/invest-openapi-js-sdk";
import fs from "fs";
import config from "config";
const apiURL = "https://api-invest.tinkoff.ru/openapi";
const sandboxApiURL = "https://api-invest.tinkoff.ru/openapi/sandbox/";
const socketURL = "wss://api-invest.tinkoff.ru/openapi/md/v1/md-openapi/ws";
const secretToken = process.env.TOKEN; // токен для боевого api
const sandboxToken = config.get("tinkoffToken");
const api = new OpenAPI({
  apiURL: sandboxApiURL,
  secretToken: sandboxToken as string,
  socketURL,
});
export default api;
export type CandleFormat = Candle;
export const mapCandle = (ticker, candleIn) => ({
  open: candleIn.o,
  close: candleIn.c,
  high: candleIn.h,
  low: candleIn.l,
  volume: candleIn.v,
  time: candleIn.time,
  interval: mapInterval(candleIn.interval),
  ticker,
});
export const mapInterval = (val) => val;
export const mapIntervalFrom = (val) => val;
