import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/index.js";
import { forbidden, unauthorized, wrap } from "../utils/http.js";

export const COOKIE = "token";

export function signToken(user) {
  return jwt.sign({ sub: String(user._id) }, env.jwtSecret, { expiresIn: "7d" });
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    maxAge: 7 * 24 * 3600 * 1000,
  });
}

async function loadUser(req) {
  const header = req.headers.authorization;
  const token = req.cookies?.[COOKIE] ?? (header?.startsWith("Bearer ") ? header.slice(7) : null);
  if (!token) return null;
  try {
    const { sub } = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(sub);
    return user && !user.isBlocked ? user : null;
  } catch {
    return null;
  }
}

export const optionalAuth = wrap(async (req, _res, next) => {
  req.user = await loadUser(req);
  next();
});

export const requireAuth = wrap(async (req, _res, next) => {
  req.user = await loadUser(req);
  if (!req.user) throw unauthorized();
  next();
});

export const requireRole =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user?.roles.some((r) => roles.includes(r))) return next(forbidden("Missing role: " + roles.join(" or ")));
    next();
  };

export const isAdmin = (user) => user.roles.includes("admin");
