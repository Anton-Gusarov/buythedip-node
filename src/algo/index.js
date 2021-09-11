"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CMO = void 0;
var talib = require("talib/build/Release/talib");
function CMO(marketData, extraCandle = null) {
    return new Promise((resolve) => {
        const data = extraCandle
            ? [...marketData.close, extraCandle.close]
            : marketData.close;
        talib.execute({
            name: "CMO",
            startIdx: 0,
            endIdx: data.length - 1,
            inReal: data,
            optInTimePeriod: 20,
        }, 
        // shouldn't be any errors unless data is valid. Check data instead
        (err, res) => {
            if (err)
                debugger;
            resolve(res);
        });
    });
}
exports.CMO = CMO;
