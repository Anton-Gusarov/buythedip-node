// tink doesn't follow standard control flow with err first
function tinkPromisify(funcWithCallback: Function) {

    return (...args) => new Promise((res) => {
        //wrap in try
        funcWithCallback.apply(null, [
            ...args,
            res
        ])
    })
}

function* gen() {
    while (true) {
        const v = yield null;
        yield v;
    }
}
export class Generatorify {
    private gen;
    constructor(funcWithCallback: Function, ...args) {
        // this.callable = tinkPromisify(funcWithCallback).bind(null, ...args)
        this.gen = gen();
        this.gen.next()
        funcWithCallback.apply(null, [
            ...args,
            ((data) => {
                this.gen.next(data)
            }).bind(this)
        ])
    }

    async *[Symbol.asyncIterator]() {
        // try {
        yield* this.gen;
        // } catch (err) {
        //   yield err
        // }
    }
}