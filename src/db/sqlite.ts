import { createConnection, getRepository } from "typeorm";
import { CandleDB } from "../entity/Candle";

export default function connect() {
  return createConnection({
    type: "sqlite",
    database: "./db.db",
    // database: ":memory:",
    dropSchema: true,
    entities: [CandleDB],
    synchronize: true,
    logging: true,
  });
}
export function getCandleRepository() {
  return getRepository(CandleDB);
}
