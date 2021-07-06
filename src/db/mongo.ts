import { Db, MongoClient } from "mongodb";
class DB {
  private _db: Db;
  async connect(uri) {
    const client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
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
