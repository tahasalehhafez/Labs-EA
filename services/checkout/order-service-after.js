// This is the "after" picture. The order logic no longer knows how money is taken.

// Bring in the payment providers from the other file.
// require means "load that file and give me what it exported".
const payments = require("./payment");

// Job A: check the order is valid. One job, one small function.
function validateOrder(order) {
  // No lines means nothing to sell, so we stop.
  if (order.lines.length === 0) {
    throw new Error("An order must have at least one line");
  }
  // Say clearly that the order passed the check.
  console.log("[order] " + order.id + " accepted");
}

// Job B: work out what the order costs. Pricing lives here and only here.
function priceOrder(order) {
  // Start the running total at zero.
  let subtotal = 0;
  // Go through the order lines one by one.
  for (let i = 0; i < order.lines.length; i++) {
    // Take the current line.
    const line = order.lines[i];
    // Add price times quantity to the running total.
    subtotal = subtotal + (line.unitPrice * line.quantity);
  }
  // Report the subtotal.
  console.log("[order] subtotal " + subtotal.toFixed(2) + " SAR");

  // Apply the Saudi VAT rate. When finance changes this, only this function changes.
  const tax = subtotal * 0.15;
  // Report the tax.
  console.log("[order] tax " + tax.toFixed(2) + " SAR");

  // The final amount the shopper pays.
  const total = subtotal + tax;
  // Report the total.
  console.log("[order] total " + total.toFixed(2) + " SAR");

  // Hand the numbers back to the caller.
  return { subtotal: subtotal, tax: tax, total: total };
}

// Job C: remember the order happened.
function saveOrder(order) {
  // In a real system this writes a row to a database.
  console.log("[order] saved order " + order.id);
}

// Job D: tell the shopper.
function notifyShopper(order) {
  // In a real system this queues an email.
  console.log("[order] email sent to " + order.customerEmail);
}

// The coordinator. Notice the second input: paymentProvider.
// The order service does not choose the provider. It is handed one.
// That is Dependency Inversion in one line of code.
function placeOrder(order, paymentProvider) {
  // Step 1: check the order.
  validateOrder(order);
  // Step 2: work out the money.
  const amounts = priceOrder(order);
  // Step 3: ask whatever provider we were given to take the money.
  // This code does not know or care which company that is.
  paymentProvider.capture(amounts.total, order.cardToken);
  // Step 4: store the order.
  saveOrder(order);
  // Step 5: tell the shopper.
  notifyShopper(order);
  // Give the final amount back.
  return amounts.total;
}

// The same example order as the "before" file, so we can compare the output.
const exampleOrder = {
  id: "ORD-8891",
  customerEmail: "sara@example.com",
  cardToken: "tok_visa_4242",
  lines: [
    { sku: "NL-CUSHION-01", unitPrice: 120.0, quantity: 2 },
    { sku: "NL-LAMP-07", unitPrice: 180.0, quantity: 1 }
  ]
};

// Run it, and choose the card provider here, at the outside edge of the system.
// This single line is the only place that knows which payment company we use.
placeOrder(exampleOrder, payments.cardPayment);