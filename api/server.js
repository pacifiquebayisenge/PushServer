const express = require("express");
const serverless = require("serverless-http"); // Required for Vercel serverless functions
const cors = require("cors");
const PUSH_MANAGER = require("./pushManager");

const app = express();
app.use(express.json());

// Enable CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: "*",
  })
);

// API Endpoints
app.post("/subscribe", (req, res) => {
  PUSH_MANAGER.subscribePush(req, res);
});

app.post("/unsubscribe", (req, res) => {
  PUSH_MANAGER.unsubscribePush(req, res);
});

app.post("/send-notification", async (req, res) => {
  await PUSH_MANAGER.sendPush(req, res);
});

// Export the handler for Vercel
module.exports = serverless(app);
