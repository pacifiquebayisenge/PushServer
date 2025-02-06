const express = require("express");
const cors = require("cors");
const PUSH_MANAGER = require("./pushManager");

const app = express();

const port = process.env.PORT || 8080

app.use(express.json());
app.use(cors({ origin: "*", methods: ["GET", "POST"], allowedHeaders: "*" }));

// API Endpoints
app.get("/", (req, res) => {  return res.status(200).json({    message: "testing",  });});

app.post("/api/subscribe", (req, res) => PUSH_MANAGER.subscribePush(req, res));
app.post("/api/check-subscription", (req, res) => PUSH_MANAGER.checkSubscription(req, res));
app.post("/api/unsubscribe", (req, res) => PUSH_MANAGER.unsubscribePush(req, res));
app.post("/api/send-notification", async (req, res) => await PUSH_MANAGER.sendPush(req, res));

app.listen(port, () => {
  `Server started on port ${port}`
})