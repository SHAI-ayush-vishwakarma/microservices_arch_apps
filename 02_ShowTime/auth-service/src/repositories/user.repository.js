import { pool } from "../db/pool.js";

const PUBLIC_COLUMNS = "id, name, email, role, created_at";

export async function createUser({ name, email, passwordHash }) {
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING ${PUBLIC_COLUMNS}`,
    [name, email, passwordHash]
  );
  return result.rows[0];
}

export async function findUserByEmail(email) {
  const result = await pool.query(
    `SELECT ${PUBLIC_COLUMNS}, password_hash FROM users WHERE email = $1`,
    [email]
  );
  return result.rows[0] ?? null;
}

export async function findUserById(id) {
  const result = await pool.query(
    `SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}
