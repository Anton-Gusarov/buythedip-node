export async function* Generatorify(funcWithCallback: Function, ...args) {
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

export function ArrayToMap(keys, values) {
  return keys.reduce((result, ticker, index) => {
    result[ticker] = values[index];
    return result;
  }, {});
}
