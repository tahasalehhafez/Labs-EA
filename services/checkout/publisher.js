// Load the Kafka client library. logLevel lets us turn down the library's own chatter.
const { Kafka, logLevel } = require("kafkajs");

// Where the event log lives. Inside Docker its name is "redpanda".
const BROKER = process.env.KAFKA_BROKER || "redpanda:29092";

// The name of the notebook we write into. A notebook is called a "topic".
const TOPIC = "northline.payments";

// Create the client. clientId is only a label that shows up in the broker logs.
// logLevel ERROR hides the library's information messages so the lesson stays readable.
const kafka = new Kafka({ clientId: "checkout", brokers: [BROKER], logLevel: logLevel.ERROR });

// A producer is the object that writes new lines into the notebook.
const producer = kafka.producer();

// An admin is the object that can create the notebook if it is not there yet.
const admin = kafka.admin();

// A helper that prints one structured log line.
function log(fields) {
  const line = { ts: new Date().toISOString(), service: "checkout" };
  Object.assign(line, fields);
  console.log(JSON.stringify(line));
}

// Make a short id for this run, so every run produces new event ids.
// We take the current time in milliseconds and keep the last six digits.
const runId = String(Date.now()).slice(-6);

// The events we are going to publish.
// Notice event three is an exact copy of event one. That is on purpose.
// Networks retry. Duplicates happen in real life. We will handle it.
const eventsToSend = [
  {
    // A unique name for this exact happening. The receiver uses it to spot repeats.
    event_id: "evt-" + runId + "-a",
    // The kind of thing that happened, written in the past tense.
    type: "PaymentCaptured",
    // Which order the money belongs to.
    order_id: "ORD-" + runId + "-1",
    // Which product was bought.
    sku: "NL-LAMP-07",
    // How many were bought.
    quantity: 1,
    // How much money moved, in Saudi Riyal.
    amount_sar: 207.0,
    // When it happened.
    occurred_at: new Date().toISOString()
  },
  {
    event_id: "evt-" + runId + "-b",
    type: "PaymentCaptured",
    order_id: "ORD-" + runId + "-2",
    sku: "NL-CUSHION-01",
    quantity: 2,
    amount_sar: 276.0,
    occurred_at: new Date().toISOString()
  },
  {
    // Same event_id as the first one. This is the deliberate duplicate.
    event_id: "evt-" + runId + "-a",
    type: "PaymentCaptured",
    order_id: "ORD-" + runId + "-1",
    sku: "NL-LAMP-07",
    quantity: 1,
    amount_sar: 207.0,
    occurred_at: new Date().toISOString()
  }
];

// The main routine. "async" means it is allowed to wait for slow things.
async function main() {
  // Connect the admin so we can check the notebook exists.
  await admin.connect();
  // Create the topic. If it already exists, this does nothing and does not fail.
  await admin.createTopics({
    topics: [{ topic: TOPIC, numPartitions: 1, replicationFactor: 1 }]
  });
  // We are finished with admin work.
  await admin.disconnect();

  // Open the connection for writing.
  await producer.connect();
  // Say we are connected, so students can see progress.
  log({ level: "info", event: "connected", broker: BROKER, topic: TOPIC });

  // Go through our list and write each event into the notebook.
  for (const evt of eventsToSend) {
    // Send one message.
    await producer.send({
      // Which notebook.
      topic: TOPIC,
      // The message itself.
      messages: [
        {
          // The key decides which partition the message lands in.
          // Using order_id keeps all events for one order in the right order.
          key: evt.order_id,
          // The body must be text, so we turn the object into JSON text.
          value: JSON.stringify(evt)
        }
      ]
    });
    // Confirm on screen what we have written.
    log({ level: "info", event: "published", event_id: evt.event_id, sku: evt.sku, quantity: evt.quantity });
  }

  // Close the connection politely.
  await producer.disconnect();
  // Final line so we know the run finished cleanly.
  log({ level: "info", event: "done", published: eventsToSend.length });
}

// Run the main routine. If anything fails, print it and exit with an error code.
main().catch(function (err) {
  // Print the failure as a structured line, like all our other logs.
  log({ level: "error", event: "failed", message: String(err.message) });
  // Exit code 1 tells Docker and any script that this run failed.
  process.exit(1);
});