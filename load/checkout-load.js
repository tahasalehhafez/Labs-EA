// Bring in the tool that makes web requests.
import http from "k6/http";
// Bring in "check", which tests one condition, and "sleep", which pauses.
import { check, sleep } from "k6";

// The address of the service. Inside the Docker network it is called "catalog".
const BASE = __ENV.BASE_URL || "http://catalog:8080";

// The settings for this test run.
export const options = {
  // How the number of fake shoppers changes over time.
  stages: [
    // Over 20 seconds, go from 0 shoppers up to 10.
    { duration: "20s", target: 10 },
    // Hold 10 shoppers steady for 30 seconds. This is where we read the numbers.
    { duration: "30s", target: 10 },
    // Over 10 seconds, come back down to 0.
    { duration: "10s", target: 0 }
  ],
  // Rules the test must pass. If a rule fails, k6 exits with an error code.
  thresholds: {
    // 95 out of every 100 requests must finish in under 300 milliseconds.
    "http_req_duration": ["p(95)<300"],
    // Fewer than 1 percent of requests may fail.
    "http_req_failed": ["rate<0.01"]
  }
};

// This function is what one fake shopper does, over and over.
export default function () {
  // Step 1: the shopper looks at a product page.
  const item = http.get(BASE + "/v1/items/NL-LAMP-07");
  // Test that the answer was 200 and had the right product in it.
  check(item, {
    "item status is 200": function (r) { return r.status === 200; },
    "item is the lamp": function (r) { return r.body.indexOf("NL-LAMP-07") !== -1; }
  });

  // Step 2: the shopper adds it to the cart.
  const add = http.get(BASE + "/v1/cart/loadtest/add/NL-LAMP-07");
  // Test that adding to the cart worked.
  check(add, {
    "cart add status is 200": function (r) { return r.status === 200; }
  });

  // Wait one second, like a real person reading the page.
  sleep(1);
}