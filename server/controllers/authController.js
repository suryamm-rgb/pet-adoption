import { COOKIE, setAuthCookie, signToken } from "../middleware/auth.js";
import * as auth from "../services/authService.js";
import { loginWithGoogle } from "../services/googleAuthService.js";
import { sendOtp, verifyOtp } from "../services/otpService.js";
import { removeSubscription, saveSubscription } from "../services/pushService.js";

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
export async function resendVerification(req, res) {
  const devToken = await auth.resendVerification(req.user);
  res.json({ ok: true, devToken });
}
export async function updateMe(req, res) {
  res.json({ user: auth.publicUser(await auth.updateProfile(req.user, req.body)) });
}
export async function changePassword(req, res) {
  session(res, await auth.changePassword(req.user, req.body)); // fresh cookie keeps this device signed in
}
export async function logoutAll(req, res) {
  await auth.logoutEverywhere(req.user);
  res.clearCookie(COOKIE).json({ ok: true });
}
export async function deleteMe(req, res) {
  await auth.deleteAccount(req.user, req.body);
  res.clearCookie(COOKIE).json({ ok: true });
}

export async function google(req, res) {
  const { user, created } = await loginWithGoogle(req.body);
  session(res, user, created ? 201 : 200, { created });
}
export async function phoneSend(req, res) {
  res.json(await sendOtp(req.user));
}
export async function phoneVerify(req, res) {
  await verifyOtp(req.user, req.body.code);
  res.json({ user: auth.publicUser(await req.user.constructor.findById(req.user._id)) });
}
export async function preferences(req, res) {
  res.json({ user: auth.publicUser(await auth.setPreferences(req.user, req.body)) });
}
export async function pushSubscribe(req, res) {
  await saveSubscription(req.user._id, req.body, req.get("user-agent")?.slice(0, 200));
  res.status(201).json({ ok: true });
}
export async function pushUnsubscribe(req, res) {
  await removeSubscription(req.user._id, req.body.endpoint);
  res.json({ ok: true });
}
