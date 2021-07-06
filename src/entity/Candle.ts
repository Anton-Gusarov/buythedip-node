import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class CandleDB {
  @PrimaryGeneratedColumn()
  id: number;

  @Column() open: number;
  @Column()
  close: number;
  @Column()
  high: number;
  @Column()
  low: number;
  @Column()
  volume: number;
  @Column()
  time: Date;
  @Column()
  interval: string;
  @Column()
  ticker: string;
}
