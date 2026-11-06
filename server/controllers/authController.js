import { COOKIE, setAuthCookie, signToken } from "../middleware/auth.js";
import * as auth from "../services/authService.js";

const session = (res, user, status = 200, extra = {}) => {
  setAuthCookie(res, signToken(user));
  res.status(status).json({ user: auth.publicUser(user), ...extra });
};

export async function register(req, res) {
  const { user, devVerifyToken } = await auth.register(req.body);
  session(res, user, 201, { devVerifyToken });
}
export async function login(req, res) {
  session(res, await auth.login(req.body));
}
export function logout(_req, res) {
  res.clearCookie(COOKIE).json({ ok: true });
}
export const me = (req, res) => res.json({ user: auth.publicUser(req.user) });
export async function verifyEmail(req, res) {
  const user = await auth.verifyEmail(req.body.token);
  res.json({ user: auth.publicUser(user) });
}
export async function forgot(req, res) {
  const devToken = await auth.forgotPassword(req.body.email);
  res.json({ ok: true, devToken });
}
export async function reset(req, res) {
  await auth.resetPassword(req.body.token, req.body.password);
  res.json({ ok: true });
}
export async function addRole(req, res) {
  res.json({ user: auth.publicUser(await auth.addRole(req.user, req.body.role)) });
}
