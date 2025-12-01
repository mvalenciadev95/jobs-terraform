import 'reflect-metadata';
import { config } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { User } from './users/entities/user.entity';

const envPath1 = join(process.cwd(), '.env');
const envPath2 = join(process.cwd(), 'apps', 'reporting-api', '.env');
const result1 = config({ path: envPath1 });
const result2 = config({ path: envPath2, override: false });

if (process.env.NODE_ENV === 'development') {
  console.log(
    'Loading .env from:',
    result1.parsed ? envPath1 : result2.parsed ? envPath2 : 'none found',
  );
  console.log(
    'POSTGRES_HOST:',
    process.env.POSTGRES_HOST || 'localhost (default)',
  );
  console.log(
    'POSTGRES_USER:',
    process.env.POSTGRES_USER || 'postgres (default)',
  );
}

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'twl_pipeline',
  entities: [User],
  migrations: ['src/migrations/**/*.ts'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
