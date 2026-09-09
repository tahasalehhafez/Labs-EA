// Load the Kafka client library.
const { Kafka, logLevel } = require("kafkajs");

// Where the event log lives, seen from inside the Docker network.
const BROKER = process.env.KAFKA_BROKER || "redpanda:29092";

// The notebook we read from. It must match what checkout writes to.
const TOPIC = "northline.payments";

// The reading group we belong to. The broker remembers our place using this name.
// This is the piece that makes catching up possible.
const GROUP = "warehouse-stock";

// Create the client and turn down the library's own chatter.
const kafka = new Kafka({ clientId: "warehouse", brokers: [BROKER], logLevel: logLevel.ERROR });

// A consumer is the object that reads lines from the notebook.
const consumer = kafka.consumer({ groupId: GROUP });

// Our stock counts. In a real system this is a database table.
const stock = {
  "NL-LAMP-07": 42,
  "NL-CUSHION-01": 130,
  "NL-RUG-22": 7
};

// A memory of every event_id we have already acted on.
// A Set is a list that refuses to hold the same value twice.
const alreadyApplied = new Set();

// A helper that prints one structured log line.
function log(fields) {
  const line = { ts: new Date().toISOString(), service: "warehouse" };
  Object.assign(line, fields);
  console.log(JSON.stringify(line));
}

// The main routine.
async function main() {
  // Open the connection to the event log.
  await consumer.connect();

  // Say which notebook we want to read.
  // fromBeginning true means: the very first time we ever join, start at line one.
  // After that the broker remembers our place, so we never re-read old lines.
  await consumer.subscribe({ topic: TOPIC, fromBeginning: true });

  // Announce we are listening.
  log({ level: "info", event: "listening", topic: TOPIC, group: GROUP });

  // Start reading. The function below runs once for every message.
  await consumer.run({
    eachMessage: async function (payload) {
      // Turn the message body from JSON text back into an object.
      const evt = JSON.parse(payload.message.value.toString());

      // IDEMPOTENCY CHECK.
      // Idempotent means: doing it twice has the same effect as doing it once.
      // If we have seen this event id before, do nothing and say so.
      if (alreadyApplied.has(evt.event_id)) {
        log({ level: "warn", event: "duplicate_ignored", event_id: evt.event_id, sku: evt.sku });
        // Stop here. Do not touch the stock.
        return;
      }

      // We only care about one kind of event. Ignore anything else politely.
      if (evt.type !== "PaymentCaptured") {
        log({ level: "info", event: "type_ignored", type: evt.type });
        return;
      }

      // Find the current stock for this product, or zero if we do not know it.
      const before = stock[evt.sku] || 0;

      // Take the sold quantity off the shelf.
      const after = before - evt.quantity;

      // Save the new number.
      stock[evt.sku] = after;

      // Remember that we handled this event, so a repeat is ignored.
      alreadyApplied.add(evt.event_id);

      // Report exactly what changed, with the numbers before and after.
      log({
        level: "info",
        event: "stock_reduced",
        event_id: evt.event_id,
        sku: evt.sku,
        quantity: evt.quantity,
        stock_before: before,
        stock_after: after
      });
    }
  });
}

// Run it, and report clearly if it fails.
main().catch(function (err) {
  log({ level: "error", event: "failed", message: String(err.message) });
  process.exit(1);
});