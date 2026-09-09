// Two slashes start a comment in JavaScript. The computer ignores these lines.
// This file is the "before" picture. One function does six different jobs.

// This function takes one order and does everything to it, start to finish.
function placeOrder(order) {

    // JOB 1 of 6: check the order makes sense before we touch anything else.
    // If there are no lines, there is nothing to sell, so we stop here.
    if (order.lines.length === 0) {
      // Throw means: stop now and report a problem.
      throw new Error("An order must have at least one line");
    }
  
    // Print a message so we can follow what happened.
    console.log("[order] " + order.id + " accepted");
  
    // JOB 2 of 6: add up the price of every line to get the subtotal.
    // We start the running total at zero.
    let subtotal = 0;
    // Look at each line in the order, one at a time.
    for (let i = 0; i < order.lines.length; i++) {
      // Take one line out of the list.
      const line = order.lines[i];
      // Multiply the price by how many the shopper wanted, and add it to the total.
      subtotal = subtotal + (line.unitPrice * line.quantity);
    }
    // Show the subtotal with exactly two decimal places.
    console.log("[order] subtotal " + subtotal.toFixed(2) + " SAR");
  
    // JOB 3 of 6: work out the tax. VAT in Saudi Arabia is 15 percent.
    // The tax rule is written directly here, which means finance cannot change it alone.
    const tax = subtotal * 0.15;
    // Show the tax amount.
    console.log("[order] tax " + tax.toFixed(2) + " SAR");
  
    // Add the tax to the subtotal to get the final amount.
    const total = subtotal + tax;
    // Show the final amount.
    console.log("[order] total " + total.toFixed(2) + " SAR");
  
    // JOB 4 of 6: charge the card. The payment provider is hard-coded right here.
    // "Hard-coded" means the choice is fixed in the code and cannot be swapped.
    console.log("[payment] captured " + total.toFixed(2) + " SAR with card token " + order.cardToken);
  
    // JOB 5 of 6: save the order. In a real system this writes to a database.
    console.log("[order] saved order " + order.id);
  
    // JOB 6 of 6: tell the shopper by email.
    console.log("[order] email sent to " + order.customerEmail);
  
    // Give the final amount back to whoever called this function.
    return total;
  }
  
  // Below is a small example order so we can run the file and see output.
  // In real life this data would arrive from the website.
  const exampleOrder = {
    // A human-readable order number.
    id: "ORD-8891",
    // Where the confirmation email goes.
    customerEmail: "sara@example.com",
    // A safe stand-in for the real card number. Never store a real card number.
    cardToken: "tok_visa_4242",
    // The things the shopper is buying.
    lines: [
      // Two cushions at 120.00 each.
      { sku: "NL-CUSHION-01", unitPrice: 120.0, quantity: 2 },
      // One lamp at 180.00.
      { sku: "NL-LAMP-07", unitPrice: 180.0, quantity: 1 }
    ]
  };
  
  // Run the function with our example order.
  placeOrder(exampleOrder);