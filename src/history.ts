import api from './api/tink'
import { Candles } from '@tinkoff/invest-openapi-js-sdk'
import db from './db'
import { getCachedFigi } from './cache/cache';

export default async function getHistory(ticker: string, toTime: Date = new Date(Date.now()), fromTime: Date = null) {
    const figi = await getCachedFigi(ticker).catch(console.error)
    // - 2 hours
    if (!fromTime) {
        fromTime = new Date(toTime);
        fromTime.setUTCHours(toTime.getUTCHours() - 2)
    }
    let candles: Candles;
    try {
        candles = await api.candlesGet({
            from: fromTime.toISOString(),
            to: toTime.toISOString(),
            figi,
            interval: '1min',
        });
    } catch (e) {
        console.error(e)
        return []
    }
    return candles.candles
}