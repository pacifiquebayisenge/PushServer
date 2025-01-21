require('dotenv').config()
const webpush = require('web-push');


// Generate VAPID keys (do this once and save the keys)
// const vapidKeys = webpush.generateVAPIDKeys();
// console.log('VAPID Keys:', vapidKeys);

// Configure web-push with your VAPID keys
webpush.setVapidDetails(
  'mailto:your@email.com', // Replace with your email
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Store subscriptions (in memory for this example - use a database in production)
let subscriptions = [];

const subscribeToPush = (req, res) => {
  console.log('Request received at /api/subscribe:', req.body);
  
  if (!req.body || !req.body.endpoint || !req.body.keys) {
    console.error('Invalid subscription payload');
    return res.status(400).json({ error: 'Invalid subscription payload' });
  }

  const subscription = req.body;
  subscriptions.push(subscription);
  console.log('Subscription added:', subscription);

  res.status(201).json({ message: 'Subscription added' });
};

const sendPush = async (req, res) => {
  const { title, body } = req.body;
  console.log('Sending notification to all subscribers');

  try {
    const notifications = subscriptions.map(subscription => 
      webpush.sendNotification(subscription, JSON.stringify({
        title: title || 'Test Notification',
        body: body || 'This is a test notification'
      }))
    );

    await Promise.all(notifications);
    res.json({ message: 'Notifications sent successfully' });
  } catch (error) {
    console.error('Error sending notifications:', error);
    res.status(500).json({ error: error.message });
  }
}

const PUSH_MANAGER = {
  subscribeToPush,
  sendPush
}

module.exports = PUSH_MANAGER