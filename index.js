// Import required modules
const express = require("express");
const http = require("http");
// const SUPABASE = require("./supabase"); // Import upload middleware and handler
const cors = require("cors"); // Import CORS
const PUSH_MANAGER = require("./pushManager");

// Initialize Express
const app = express();

app.use(express.json());

// CORS middleware for Express
app.use(
  cors({
    origin: "*", // Allow all origins
    methods: ["GET", "POST"],
    credentials: false, // Set to false if you don't need credentials
    allowedHeaders: "*",
  })
);

app.options("*", cors());

// Update the subscribe endpoint with error handling
app.post("/api/subscribe", (req, res) => {
  try {
    if (!req.body || !req.body.endpoint) {
      return res.status(400).json({ error: "Invalid subscription object" });
    }
    PUSH_MANAGER.subscribeToPush(req, res);
  } catch (error) {
    console.error("Subscribe error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/send-notification", async (req, res) => {
  await PUSH_MANAGER.sendPush(req, res);
});

// Create an HTTP server
const server = http.createServer(app);

// Start the server on port 3001
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});