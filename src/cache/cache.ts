// perhaps future api class

import api from "../api/tink";
import db from "../db";
// figi->ticker
const mapTickerFigi = {};
export async function getCachedFigi(ticker: string) {
  const tickers = db().collection("tickers");
  let tickerDB;
  if (true === !!(tickerDB = await tickers.findOne({ ticker }))) {
    mapTickerFigi[tickerDB.figi] = ticker;
    return tickerDB.figi;
  }
  const { figi } = await api.searchOne({ ticker });
  //TODO delayed insert
  await tickers.insertOne({
    figi,
    ticker,
  });
  mapTickerFigi[figi] = ticker;
  return figi;
}

export function getTickerByFIGI(figi) {
  return mapTickerFigi[figi];
}
