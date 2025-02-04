const express = require("express");
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
app.get("/api/test", (req, res) => {
  return res.status(200).json({
    message: "Already registered for push notifications",
  });
});


app.post("/api/subscribe", (req, res) => {
  PUSH_MANAGER.subscribePush(req, res);
});

app.post("/api/unsubscribe", (req, res) => {
  PUSH_MANAGER.unsubscribePush(req, res);
});

app.post("/api/send-notification", async (req, res) => {
  await PUSH_MANAGER.sendPush(req, res);
});

// Export the handler for Vercel
module.exports = app
