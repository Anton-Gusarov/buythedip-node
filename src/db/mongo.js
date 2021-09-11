"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connect = void 0;
const mongodb_1 = require("mongodb");
class DB {
    async connect(uri) {
        const client = new mongodb_1.MongoClient(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        await client.connect();
        this._db = client.db("app");
    }
    get db() {
        return this._db;
    }
}
const instance = new DB();
exports.connect = instance.connect.bind(instance);
exports.default = () => instance.db;
