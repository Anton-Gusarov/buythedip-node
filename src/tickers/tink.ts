import api from "../api/tink";
import { getCachedFigi } from "../cache/cache";
import { Candle } from "../types";
import { Generatorify } from "../utils";

export default function createGenerators(tickers:string[]): Promise<Generatorify[]> {
    
    return Promise.all(tickers.map(async (ticker) => {
        const figi = await getCachedFigi(ticker).catch(console.error)
        return new Generatorify(api.candle.bind(api), {figi})
    }))
}
