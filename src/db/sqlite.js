"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCandleRepository = void 0;
const typeorm_1 = require("typeorm");
const Candle_1 = require("../entity/Candle");
function connect() {
    return (0, typeorm_1.createConnection)({
        type: "sqlite",
        database: "./db.db",
        // database: ":memory:",
        dropSchema: true,
        entities: [Candle_1.CandleDB],
        synchronize: true,
        logging: true,
    });
}
exports.default = connect;
function getCandleRepository() {
    return (0, typeorm_1.getRepository)(Candle_1.CandleDB);
}
exports.getCandleRepository = getCandleRepository;
