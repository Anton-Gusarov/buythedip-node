import { Candle } from "@tinkoff/invest-openapi-js-sdk";
import api from "../api/tink";
import { getCachedFigi } from "../cache/cache";
import { Generatorify } from "../utils";

export default function createGenerators(tickers:string[]): Promise<AsyncIterable<Candle>[]> {
    
    return Promise.all(tickers.map(async (ticker) => {
        const figi = await getCachedFigi(ticker).catch(console.error)
        return Generatorify(api.candle.bind(api), {figi})
    }))
}
