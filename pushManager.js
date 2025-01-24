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
const subscribePush = async (req, res) => {
  console.log("Request received at /api/subscribe:", req.body);

  if (!req.body || !req.body.endpoint || !req.body.keys) {
    console.error("Invalid subscription payload");
    return res.status(400).json({ error: "Invalid subscription payload" });
  }

  const subscription = req.body;

  try {
    // Check if subscription already exists
    const { data: existingSubscription, error: fetchError } = await supabase
      .from("push-subscriptions")
      .select("*")
      .eq("endpoint", subscription.endpoint)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      // Ignore "No rows found" error (PGRST116) and handle other errors
      console.error("Error checking subscription in Supabase:", fetchError);
      return res.status(500).json({ error: fetchError.message });
    }

    if (existingSubscription) {
      // Subscription already exists
      console.log("Subscription already exists:", existingSubscription);
      return res.status(200).json({
        message: "Already registered for push notifications",
      });
    }

    // Insert new subscription into Supabase
    const { data, error } = await supabase
      .from("push-subscriptions")
      .insert([{ endpoint: subscription.endpoint, keys: subscription.keys }]);

    if (error) {
      console.error("Error saving subscription to Supabase:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("Subscription added !", subscription);
    res.status(201).json({ message: "Subscription added", subscription });
  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).json({ error: "An unexpected error occurred" });
  }
};

const unsubscribePush = async (req, res) => {
  console.log("Request received at /api/unsubscribe:", req.body);

  if (!req.body || !req.body.endpoint || !req.body.keys) {
    console.error("Invalid subscription payload");
    return res.status(400).json({ error: "Invalid subscription payload" });
  }

  const subscription = req.body;

  try {
    // Check if the subscription exists in Supabase
    const { data: existingSubscription, error: fetchError } = await supabase
      .from("push-subscriptions")
      .select("*")
      .eq("endpoint", subscription.endpoint)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      // Ignore "No rows found" error (PGRST116) and handle other errors
      console.error("Error checking subscription in Supabase:", fetchError);
      return res.status(500).json({ error: fetchError.message });
    }

    if (!existingSubscription) {
      // Subscription doesn't exist, so do nothing
      console.log("No existing subscription found.");
      return res.status(200).json({ message: "No subscription to delete" });
    }

    // Subscription exists, delete it
    const { error: deleteError } = await supabase
      .from("push-subscriptions")
      .delete()
      .eq("endpoint", subscription.endpoint);

    if (deleteError) {
      console.error("Error deleting subscription from Supabase:", deleteError);
      return res.status(500).json({ error: deleteError.message });
    }

    console.log("Subscription deleted successfully:", subscription);
    return res
      .status(200)
      .json({ message: "Successfully deleted the subscription" });
  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).json({ error: "An unexpected error occurred" });
  }
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

    // Process subscriptions and send notifications
    const failedSubscriptions = [];

    for (let subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          subscription,
          JSON.stringify({
            title: title || "Test Notification",
            body: body || "This is a test notification",
          })
        );
        // console.log(`Notification sent to ${subscription.endpoint}`);
      } catch (err) {
        console.error(
          `Failed to send notification to ${subscription.endpoint}:`,
          err
        );
        // If the subscription is invalid or unsubscribed, add to failedSubscriptions
        failedSubscriptions.push(subscription.endpoint);
        continue; // Skip to the next subscription
      }
    }

    console.log(
      `Sent ${
        subscriptions.length - failedSubscriptions.length
      } notifications succesfully`
    );

    // Delete failed subscriptions from the database
    if (failedSubscriptions.length > 0) {
      const { error: deleteError } = await supabase
        .from("push-subscriptions")
        .delete()
        .in("endpoint", failedSubscriptions);

      if (deleteError) {
        console.error("Error deleting failed subscriptions:", deleteError);
        return res.status(500).json({ error: deleteError.message });
      }

      console.log(`Deleted ${failedSubscriptions.length} failed subscriptions`);
    }

    res.json({
      message: "Notifications sent successfully, invalid subscriptions deleted",
    });
  } catch (error) {
    console.error("Error sending notifications:", error);
    res.status(500).json({ error: error.message });
  }
};

const PUSH_MANAGER = {
  subscribePush,
  sendPush,
};

module.exports = PUSH_MANAGER;
