import { Candle } from "../api";
import { MarketData } from "../store";
var talib = require("talib/build/Release/talib");
export function CMO(marketData: MarketData, extraCandle: Candle = null) {
  return new Promise((resolve) => {
    const data = extraCandle
      ? [...marketData.close, extraCandle.close]
      : marketData.close;
    talib.execute(
      {
        name: "CMO",
        startIdx: 0,
        endIdx: data.length - 1,
        inReal: data,
        optInTimePeriod: 20,
      },
      // shouldn't be any errors unless data is valid. Check data instead
      (err, res: any) => {
        if (err) debugger;
        // no need to keep indicators in store for now
        resolve(res);
      }
    );
  });
}
