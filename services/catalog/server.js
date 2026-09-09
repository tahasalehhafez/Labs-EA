// Load express, the library that listens for web requests and sends answers back.
const express = require("express");

// Create the application object. Everything is attached to this.
const app = express();

// Read the port number from the environment, or use 8080 if nobody set one.
// A port is the numbered door on the machine that this program listens at.
const PORT = process.env.PORT || 8080;

// A name for this service, used in every log line so we know who spoke.
const SERVICE = "catalog";

// The container id, so when we run three copies we can see which one answered.
// Docker sets HOSTNAME automatically to a short random id.
const INSTANCE = process.env.HOSTNAME || "local";

// Our product data. In a real system this is a database.
// Catalog owns this data. No other service may touch it. That is ADR-001.
const ITEMS = {
  "NL-LAMP-07": { sku: "NL-LAMP-07", name: "Riyadh Reading Lamp", price_sar: 180.0, in_stock: 42 },
  "NL-CUSHION-01": { sku: "NL-CUSHION-01", name: "Najd Cotton Cushion", price_sar: 120.0, in_stock: 130 },
  "NL-RUG-22": { sku: "NL-RUG-22", name: "Asir Wool Rug", price_sar: 940.0, in_stock: 7 }
};

// A helper that prints one log line as JSON, on a single line.
// Structured logs can be searched by a machine. Free text cannot.
function log(fields) {
  // Start with the information that every line must carry.
  const line = {
    // When it happened, in a standard format that sorts correctly.
    ts: new Date().toISOString(),
    // Which service produced the line.
    service: SERVICE,
    // Which copy of the service produced the line.
    instance: INSTANCE
  };
  // Copy in the extra fields the caller gave us.
  Object.assign(line, fields);
  // Print the whole thing as one line of JSON text.
  console.log(JSON.stringify(line));
}

// Door 1: the health check. Monitoring calls this to ask "are you alive?".
app.get("/health", function (req, res) {
  // Answer with a small JSON object and the default status 200.
  res.json({ status: "ok", service: SERVICE, instance: INSTANCE });
});

// Door 2: read one product by its sku.
// The colon in ":id" means "this part of the address is a value, not fixed text".
app.get("/v1/items/:id", function (req, res) {
  // Take the value the caller put in the address.
  const id = req.params.id;

  // Look the product up in our data.
  const item = ITEMS[id];

  // If we found nothing, say so clearly and stop here.
  if (!item) {
    // Write a log line so we can count how often this happens.
    log({ level: "warn", event: "item_not_found", sku: id, status: 404 });
    // Send status 404 with the exact body our contract promised.
    res.status(404).json({
      // The stable machine code. Callers match on this.
      error: "item_not_found",
      // The human message. Safe to change or translate.
      message: "No item with sku " + id
    });
    // return stops the function here, so we do not also send a 200.
    return;
  }

  // We found it. Write a log line for the successful read.
  log({ level: "info", event: "item_read", sku: id, status: 200 });

  // Send the product back as JSON, with the default status 200.
  res.json(item);
});

// Start listening. The first argument is the port, the second runs once we are ready.
app.listen(PORT, function () {
  // Announce that we are open for business.
  log({ level: "info", event: "started", port: PORT });
});