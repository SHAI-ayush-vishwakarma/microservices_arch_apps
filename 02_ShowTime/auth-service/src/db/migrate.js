import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(currentDir, "../../migrations");

async function runMigrations() {
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    await pool.query(sql);
    console.log(`[auth-service] Applied migration: ${file}`);
  }
}

try {
  await runMigrations();
  console.log("[auth-service] All migrations applied");
} catch (error) {
  console.error("[auth-service] Migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
