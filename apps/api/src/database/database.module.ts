import { Global, Module } from '@nestjs/common';
import { db } from './db';

export const DB_TOKEN = Symbol('DRIZZLE_DB');

@Global()
@Module({
  providers: [
    {
      provide: DB_TOKEN,
      useValue: db,
    },
  ],
  exports: [DB_TOKEN],
})
export class DatabaseModule {}
