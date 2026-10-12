import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { AppError } from "../middleware/errorHandler.js";
import * as userRepository from "../repositories/user.repository.js";

const BCRYPT_ROUNDS = 10;
const UNIQUE_VIOLATION = "23505"; // Postgres error code for UNIQUE constraint

function toPublicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.created_at };
}

function createToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );
}

export async function signup({ name, email, password }) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  try {
    const user = await userRepository.createUser({ name, email, passwordHash });
    return toPublicUser(user);
  } catch (error) {
    if (error.code === UNIQUE_VIOLATION) {
      throw new AppError(409, "Email is already registered");
    }
    throw error;
  }
}

export async function login({ email, password }) {
  const user = await userRepository.findUserByEmail(email);
  const isPasswordValid = user ? await bcrypt.compare(password, user.password_hash) : false;

  if (!isPasswordValid) {
    throw new AppError(401, "Invalid email or password");
  }

  return { token: createToken(user), user: toPublicUser(user) };
}

export async function getCurrentUser(userId) {
  const user = await userRepository.findUserById(userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }
  return toPublicUser(user);
}
