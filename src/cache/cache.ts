// perhaps future api class

import api from '../api/tink'
import db from '../db'

export async function getCachedFigi(ticker:string) {
    const tickers = db().collection('tickers');
    let tickerDB
    if (true===!!(tickerDB = await tickers.findOne({ticker}))) {
        return tickerDB.figi;
    }
    const { figi } = await api.searchOne({ ticker });
    //TODO delayed insert
    await tickers.insertOne({
        figi,
        ticker
    })
    return figi
}