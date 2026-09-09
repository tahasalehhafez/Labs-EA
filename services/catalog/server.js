// Load express, the library that answers web requests.
const express = require("express");

// Load the Redis client. Redis is a small, very fast shared store.
const { createClient } = require("redis");

// Create the application object.
const app = express();

// Allow the app to read JSON bodies sent by callers.
app.use(express.json());

// The port we listen on.
const PORT = process.env.PORT || 8080;

// A name for this service, printed in every log line.
const SERVICE = "catalog";

// Which copy of the service this is. Docker sets HOSTNAME to a short random id.
const INSTANCE = process.env.HOSTNAME || "local";

// Where carts are kept: the word "memory" or the word "redis".
const SESSION_STORE = process.env.SESSION_STORE || "memory";

// The address of the Redis container on the private Docker network.
const REDIS_URL = process.env.REDIS_URL || "redis://redis:6379";

// The address of an outside shipping partner. It does not exist, on purpose.
const SHIPPING_URL = process.env.SHIPPING_URL || "http://shipping-partner.invalid/quote";

// How long we are willing to wait for that partner, in milliseconds.
// 800 milliseconds is a little under one second.
const SHIPPING_TIMEOUT_MS = Number(process.env.SHIPPING_TIMEOUT_MS || 800);

// Our product data. Catalog owns it. Nobody else touches it. That is ADR-001.
const ITEMS = {
  "NL-LAMP-07": { sku: "NL-LAMP-07", name: "Riyadh Reading Lamp", price_sar: 180.0, in_stock: 42 },
  "NL-CUSHION-01": { sku: "NL-CUSHION-01", name: "Najd Cotton Cushion", price_sar: 120.0, in_stock: 130 },
  "NL-RUG-22": { sku: "NL-RUG-22", name: "Asir Wool Rug", price_sar: 940.0, in_stock: 7 }
};

// Carts kept inside this running program. Empty when the program restarts.
const memoryCarts = {};

// The Redis connection. It stays null until we connect.
let redis = null;

// A flag telling us whether Redis is usable right now.
let redisReady = false;

// A helper that prints one structured log line as JSON.
function log(fields) {
  const line = { ts: new Date().toISOString(), service: SERVICE, instance: INSTANCE };
  Object.assign(line, fields);
  console.log(JSON.stringify(line));
}

// Connect to Redis, but only if we were told to use it.
async function connectRedis() {
  // If we are in memory mode, there is nothing to connect to.
  if (SESSION_STORE !== "redis") {
    log({ level: "warn", event: "session_store", store: "memory", note: "carts are not shared between copies" });
    return;
  }
  // Build the client using the address from the environment.
  redis = createClient({ url: REDIS_URL });
  // If Redis has a problem later, note it and mark ourselves not ready.
  redis.on("error", function (err) {
    redisReady = false;
    log({ level: "error", event: "redis_error", message: String(err.message) });
  });
  // Open the connection and wait for it.
  await redis.connect();
  // Mark ourselves ready to serve carts.
  redisReady = true;
  // Say it worked.
  log({ level: "info", event: "session_store", store: "redis", url: REDIS_URL });
}

// Read one cart, from wherever carts live today.
async function readCart(sessionId) {
  // Memory mode: look in our own object, or give back an empty list.
  if (SESSION_STORE !== "redis") {
    return memoryCarts[sessionId] || [];
  }
  // Redis mode: fetch the stored text for this session.
  const text = await redis.get("cart:" + sessionId);
  // If nothing was stored, the cart is empty.
  if (!text) {
    return [];
  }
  // Turn the stored JSON text back into a list.
  return JSON.parse(text);
}

// Save one cart, to wherever carts live today.
async function writeCart(sessionId, lines) {
  // Memory mode: keep it in our own object.
  if (SESSION_STORE !== "redis") {
    memoryCarts[sessionId] = lines;
    return;
  }
  // Redis mode: store the list as JSON text, and forget it after 3600 seconds.
  // EX means "expire". Carts should not live forever.
  await redis.set("cart:" + sessionId, JSON.stringify(lines), { EX: 3600 });
}

// ---------------------------------------------------------------------
// CIRCUIT BREAKER
// A circuit breaker is the electrical fuse in your home, for software.
// After several failures in a row, it stops trying for a while, so we
// fail fast instead of making every shopper wait for a dead system.
// ---------------------------------------------------------------------

// How many failures in a row we have had.
let breakerFailures = 0;

// The time, in milliseconds, until which the breaker stays open.
let breakerOpenUntil = 0;

// How many failures we allow before we stop trying.
const BREAKER_THRESHOLD = 3;

// How long we stop trying for, in milliseconds. 10000 is ten seconds.
const BREAKER_COOLDOWN_MS = 10000;

// Ask the outside shipping partner for a price, with a timeout and a breaker.
async function getShippingQuote(sku) {
  // Read the clock once.
  const now = Date.now();

  // If the breaker is open, do not even try. Fail immediately.
  if (now < breakerOpenUntil) {
    // Report that we skipped the call on purpose.
    log({ level: "warn", event: "breaker_open", sku: sku, reopens_in_ms: breakerOpenUntil - now });
    // Throw a clear reason the caller can turn into a message.
    throw new Error("circuit_open");
  }

  // Try the call.
  try {
    // AbortSignal.timeout cancels the request if it takes too long.
    // Without this, one slow partner can hold every one of our workers.
    const response = await fetch(SHIPPING_URL + "?sku=" + sku, {
      signal: AbortSignal.timeout(SHIPPING_TIMEOUT_MS)
    });
    // Read the answer.
    const body = await response.json();
    // The call worked, so reset the failure count to zero.
    breakerFailures = 0;
    // Hand the answer back.
    return body;
  } catch (err) {
    // The call failed or timed out. Count it.
    breakerFailures = breakerFailures + 1;
    // Write down what went wrong and how many failures we have now.
    log({ level: "error", event: "shipping_call_failed", failures: breakerFailures, message: String(err.message) });
    // If we have failed enough times, open the breaker and stop trying.
    if (breakerFailures >= BREAKER_THRESHOLD) {
      breakerOpenUntil = Date.now() + BREAKER_COOLDOWN_MS;
      log({ level: "warn", event: "breaker_opened", cooldown_ms: BREAKER_COOLDOWN_MS });
    }
    // Pass the failure up to the caller.
    throw new Error("shipping_unavailable");
  }
}

// ---------------------------------------------------------------------
// THE DOORS
// ---------------------------------------------------------------------

// LIVENESS. "Am I alive?" If this fails, restart me.
// It must never check anything outside this process.
app.get("/health", function (req, res) {
  res.json({ status: "ok", service: SERVICE, instance: INSTANCE });
});

// READINESS. "Should traffic be sent to me right now?"
// It checks the things we need in order to do useful work.
app.get("/ready", function (req, res) {
  // In memory mode we need nothing else, so we are always ready.
  if (SESSION_STORE !== "redis") {
    res.json({ ready: true, store: "memory", instance: INSTANCE });
    return;
  }
  // In redis mode, we are only ready if the Redis connection is healthy.
  if (redisReady) {
    res.json({ ready: true, store: "redis", instance: INSTANCE });
    return;
  }
  // 503 means "service unavailable". A load balancer will stop sending traffic here.
  res.status(503).json({ ready: false, store: "redis", reason: "redis_not_connected", instance: INSTANCE });
});

// Read one product by its sku.
app.get("/v1/items/:id", function (req, res) {
  // Take the sku out of the address.
  const id = req.params.id;
  // Look it up.
  const item = ITEMS[id];
  // Not found: answer exactly as the contract promised.
  if (!item) {
    log({ level: "warn", event: "item_not_found", sku: id, status: 404 });
    res.status(404).json({ error: "item_not_found", message: "No item with sku " + id });
    return;
  }
  // Found: log it and send it.
  log({ level: "info", event: "item_read", sku: id, status: 200 });
  res.json(item);
});

// Read the cart for one shopper session.
app.get("/v1/cart/:sessionId", async function (req, res) {
  // Which shopper we are talking about.
  const sessionId = req.params.sessionId;
  // Fetch their cart from wherever carts live.
  const lines = await readCart(sessionId);
  // Log which copy answered, so we can prove the point later.
  log({ level: "info", event: "cart_read", session: sessionId, lines: lines.length });
  // Send back the cart plus the id of the copy that answered.
  res.json({ session: sessionId, served_by: INSTANCE, store: SESSION_STORE, lines: lines });
});

// Add one product to the cart.
// A browser address bar can only send GET, and many people in the room are
// not comfortable with curl. So we accept GET here to keep the class moving.
// A real production API would use POST for something that changes data.
app.get("/v1/cart/:sessionId/add/:sku", async function (req, res) {
  // Which shopper.
  const sessionId = req.params.sessionId;
  // Which product.
  const sku = req.params.sku;
  // Refuse products we do not sell.
  if (!ITEMS[sku]) {
    res.status(404).json({ error: "item_not_found", message: "No item with sku " + sku });
    return;
  }
  // Read the current cart.
  const lines = await readCart(sessionId);
  // Add one line for this product.
  lines.push({ sku: sku, quantity: 1, added_by: INSTANCE });
  // Save it back.
  await writeCart(sessionId, lines);
  // Say what happened and which copy did it.
  log({ level: "info", event: "cart_add", session: sessionId, sku: sku, lines: lines.length });
  res.json({ session: sessionId, served_by: INSTANCE, store: SESSION_STORE, lines: lines });
});

// Ask the outside shipping partner for a price. This is where the breaker lives.
app.get("/v1/items/:id/shipping", async function (req, res) {
  // Which product we want a shipping price for.
  const id = req.params.id;
  try {
    // Try the outside call.
    const quote = await getShippingQuote(id);
    // It worked. Send the price on.
    res.json({ sku: id, shipping: quote, served_by: INSTANCE });
  } catch (err) {
    // It failed. Tell the shopper the truth, and be explicit about their money.
    // "money_moved" removes the worst question a shopper can have.
    res.status(503).json({
      error: "shipping_unavailable",
      message: "We could not get a delivery price right now. No money has been taken from your card. Please try again in a minute.",
      money_moved: false,
      reason: String(err.message),
      served_by: INSTANCE
    });
  }
});

// ---------------------------------------------------------------------
// START UP
// ---------------------------------------------------------------------

// Connect to Redis if needed, then start listening.
connectRedis()
  .then(function () {
    app.listen(PORT, function () {
      log({ level: "info", event: "started", port: PORT, store: SESSION_STORE });
    });
  })
  .catch(function (err) {
    // If Redis was required and could not be reached, say so and stop.
    log({ level: "error", event: "startup_failed", message: String(err.message) });
    process.exit(1);
  });