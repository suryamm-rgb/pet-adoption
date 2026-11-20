process.env.NODE_ENV = "test";
process.env.AUTO_VERIFY_EMAIL = "false";

import assert from "node:assert/strict";
import { test } from "node:test";
const { layout, outbox, sendMail, verifyEmailMail } = await import("../services/mailService.js");

test("sendMail collects into the outbox in test mode and skips empty recipients", async () => {
  outbox.length = 0;
  assert.equal(await sendMail({ to: "", subject: "x", intro: "y" }), false);
  assert.equal(await sendMail({ to: "a@b.com", subject: "Hi", intro: "There" }), true);
  assert.equal(outbox.length, 1);
  assert.match(outbox[0].html, /PawStay/);
});

test("verification email contains the token link", async () => {
  outbox.length = 0;
  await verifyEmailMail({ name: "Sam", email: "sam@example.com" }, "tok123");
  assert.match(outbox[0].text, /verify-email\?token=tok123/);
});

test("layout escapes HTML in user supplied text", () => {
  const { html } = layout({ title: "t", intro: "<script>alert(1)</script>" });
  assert.ok(!html.includes("<script>"));
});

test("monitoring helpers never throw when Sentry is off", async () => {
  const { captureError, monitoringEnabled } = await import("../config/monitoring.js");
  assert.equal(monitoringEnabled, false);
  assert.doesNotThrow(() => captureError(new Error("boom"), { userId: "x", path: "/y" }));
});
