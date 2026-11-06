import http from "node:http";
import { createApp } from "./app.js";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";
import { startJobs } from "./jobs/index.js";
import { initSockets } from "./sockets/index.js";
import { isMock } from "./services/razorpayService.js";

await connectDb();
const server = http.createServer(createApp());
initSockets(server);
startJobs();
server.listen(env.port, () => {
  console.log(`API on http://localhost:${env.port}  (payments: ${isMock ? "MOCK mode" : "Razorpay"})`);
});
