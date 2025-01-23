require("dotenv").config();
const webpush = require("web-push");
const { createClient } = require("@supabase/supabase-js");

// Generate VAPID keys (do this once and save the keys)
// const vapidKeys = webpush.generateVAPIDKeys();
// console.log('VAPID Keys:', vapidKeys);

// Configure web-push with your VAPID keys
webpush.setVapidDetails(
  "mailto:your@email.com", // Replace with your email
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Store subscription in Supabase
const subscribeToPush = async (req, res) => {
  console.log("Request received at /api/subscribe:", req.body);

  if (!req.body || !req.body.endpoint || !req.body.keys) {
    console.error("Invalid subscription payload");
    return res.status(400).json({ error: "Invalid subscription payload" });
  }

  const subscription = req.body;

  // Insert subscription into Supabase
  const { data, error } = await supabase
    .from("push-subscriptions")
    .insert([{ endpoint: subscription.endpoint, keys: subscription.keys }]);

  if (error) {
    console.error("Error saving subscription to Supabase:", error);
    return res.status(500).json({ error: error.message });
  }

  console.log("Subscription added:", data);

  res.status(201).json({ message: "Subscription added" });
};

// Retrieve subscriptions and send push notifications
const sendPush = async (req, res) => {
  const { title, body } = req.body;
  console.log("Sending notification to all subscribers");

  try {
    // Retrieve subscriptions from Supabase
    const { data: subscriptions, error } = await supabase
      .from("push-subscriptions")
      .select("*");

    if (error) {
      console.error("Error retrieving subscriptions:", error);
      return res.status(500).json({ error: error.message });
    }

    // Send notification to all subscribers
    const notifications = subscriptions.map((subscription) =>
      webpush.sendNotification(
        subscription,
        JSON.stringify({
          title: title || "Test Notification",
          body: body || "This is a test notification",
        })
      )
    );

    await Promise.all(notifications);
    res.json({ message: "Notifications sent successfully" });
  } catch (error) {
    console.error("Error sending notifications:", error);
    res.status(500).json({ error: error.message });
  }
};

const PUSH_MANAGER = {
  subscribeToPush,
  sendPush,
};

module.exports = PUSH_MANAGER;
