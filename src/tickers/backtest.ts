async function * backtestGenerator(data) {
    
    for (const d of data) {
        await delay()
        yield d;
    }
}

export default function createGenerators<T>(datas: T[][]): AsyncGenerator[] {
    return datas.map((data: T[])=>{
        return backtestGenerator(data)
    })
}
// for visual backtesting
function delay() {
    return new Promise(res=>setTimeout(res,1000));
}