import pg from "pg";
import { config } from "../config.js";

// get some set of connections from pool 
export const pool = new pg.Pool({ connectionString: config.DATABASE_URL });

pool.on("error", (error) => {
  console.error("[auth-service] Unexpected Postgres error:", error.message);
});
