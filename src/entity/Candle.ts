import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

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
  @Column({ nullable: true })
  cmo3: number;
  @Column({ nullable: true })
  cmo5: number;
  @Column({ nullable: true })
  cmo15: number;
  @Index()
  @Column()
  time: number;
  @Column()
  interval: string;
  @Column()
  ticker: string;
}
