//mongodb://admin:admin@localhost:27017/?authSource=admin&readPreference=primary&appname=MongoDB%20Compass&ssl=false
import { Db, MongoClient } from "mongodb";
// Replace the uri string with your MongoDB deployment's connection string.
const uri =
  "mongodb://admin:admin@localhost:27017/?authSource=admin&readPreference=primary&appname=MongoDB%20Compass&ssl=false";
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
class DB {
  private _db: Db;
  private client = client;
  async connect() {
    await client.connect();
    this._db = client.db("app");
  }

  public get db(): Db {
    return this._db;
  }
}
const instance = new DB();
export const connect = instance.connect.bind(instance);
export default () => instance.db;
