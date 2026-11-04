import { env } from 'cloudflare:workers';

export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  all<Row>(): Promise<{ results: Row[] }>;
  first<Row>(): Promise<Row | null>;
  run(): Promise<{ meta: { changes: number } }>;
}

export const db = env.DB as unknown as {
  prepare(query: string): D1Statement;
};
