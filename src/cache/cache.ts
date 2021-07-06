// perhaps future api class

import api from "../api/tink";
import db from "../db/mongo";
// figi->ticker
const mapTickerFIGI = {};
const mapFIGITicker = {};
export async function getCachedFigi(ticker: string) {
  if (mapTickerFIGI[ticker]) return mapTickerFIGI[ticker];
  const tickers = db().collection("tickers");
  let tickerDB;
  if (true === !!(tickerDB = await tickers.findOne({ ticker }))) {
    mapFIGITicker[tickerDB.figi] = ticker;
    mapTickerFIGI[ticker] = tickerDB.figi;
    return tickerDB.figi;
  }
  const { figi } = await api.searchOne({ ticker });
  //TODO delayed insert
  await tickers.insertOne({
    figi,
    ticker,
  });
  mapFIGITicker[figi] = ticker;
  mapTickerFIGI[ticker] = figi;
  return figi;
}
// No db queries here because the app doesn't know any figis
export function getTickerByFIGI(figi) {
  return mapFIGITicker[figi];
}
