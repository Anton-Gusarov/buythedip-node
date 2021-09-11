"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.concatGenerators = exports.ArrayToMap = exports.Generatorify = void 0;
async function* Generatorify(funcWithCallback, ...args) {
    let resolve;
    let results = [];
    let promise = new Promise((r) => (resolve = r));
    funcWithCallback.apply(null, [
        ...args,
        (data) => {
            results.push(data);
            resolve();
            promise = new Promise((r) => (resolve = r));
        },
    ]);
    while (true) {
        await promise;
        yield* results;
        results = [];
    }
}
exports.Generatorify = Generatorify;
function ArrayToMap(keys, values) {
    return keys.reduce((result, ticker, index) => {
        result[ticker] = values[index];
        return result;
    }, {});
}
exports.ArrayToMap = ArrayToMap;
async function* concatGenerators(...generators) {
    for (const gen of generators) {
        yield* gen;
    }
}
exports.concatGenerators = concatGenerators;
