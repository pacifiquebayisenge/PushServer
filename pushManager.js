require("dotenv").config();
const chalk = require("chalk");
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

const validateSubscription = (req, res) => {
  if (!req.body?.endpoint || !req.body?.keys) {
    return res.status(400).json({ error: "Invalid subscription payload" });
  }
  return { endpoint: req.body.endpoint, keys: req.body.keys };
};

// Store subscription in Supabase
const subscribePush = async (req, res) => {
  const subscription = validateSubscription(req, res);
  if (!subscription) return;

  const { data: existing, error } = await supabase
    .from("push-subscriptions")
    .select("*")
    .eq("endpoint", subscription.endpoint)
    .single();

  // This check prevents false errors when a subscription is simply not found.
  if (error && error.code !== "PGRST116")
    return res.status(500).json({ error: error.message });

  if (existing) {
    console.log("Subscription already registered", subscription.endpoint);
    return res
      .status(200)
      .json({ message: "Already registered", subscription: existing });
  }

  const { error: insertError } = await supabase
    .from("push-subscriptions")
    .insert(subscription);

  if (insertError) {
    console.log("Error when adding subscription", subscription.endpoint);
    return res.status(500).json({ error: insertError.message });
  }

  res.status(201).json({ message: "Subscription added", subscription });
  console.log(chalk.cyan("✅ Subscription added: "), subscription.endpoint);
};

// Check if subscription already exists
const checkSubscription = async (req, res) => {
  const subscription = validateSubscription(req, res);
  if (!subscription) return;

  const { data: existing, error } = await supabase
    .from("push-subscriptions")
    .select("endpoint, keys")
    .eq("endpoint", subscription.endpoint)
    .single();

  // This check prevents false errors when a subscription is simply not found.
  if (error && error.code !== "PGRST116")
    return res.status(500).json({ error: error.message });

  if (existing) {
    console.log(chalk.cyan("✅ Subscription exists :"), subscription.endpoint);
    return res
      .status(200)
      .json({ message: "Subscription exists", subscription: existing });
  }

  res.status(404).json({ message: "Subscription not found" });
  console.log("Subscription not found", subscription.endpoint);
};

const unsubscribePush = async (req, res) => {
  const subscription = validateSubscription(req, res);
  if (!subscription) return;

  const { error } = await supabase
    .from("push-subscriptions")
    .delete()
    .eq("endpoint", subscription.endpoint);

  if (error) {
    console.log("error when deleting subscription", subscription.endpoint);
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json({ message: "Subscription deleted" });
  console.log(chalk.cyan("✅ Subscription deleted :"), subscription.endpoint);
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
            title: title || "Pic Roulette",
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
  checkSubscription,
  unsubscribePush,
  sendPush,
};

module.exports = PUSH_MANAGER;
