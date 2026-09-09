// This file has one job only: take money. Nothing else.
// If the payment company changes, only this file changes.

// This is our "interface". An interface is a written promise about the shape
// of a thing: what functions it has, and what they take and give back.
// JavaScript has no interface keyword, so we write the promise as a comment
// and keep every payment provider to the same shape.
//
//   capture(amountSar, cardToken)  ->  returns a text receipt id
//
// Any object that has a capture function with that shape can be used.

// Our first provider. It pretends to talk to a real card company.
const cardPayment = {
    // A friendly name, so logs and tests can say which provider ran.
    name: "card",
  
    // Take the money. Two inputs: the amount in SAR, and a safe card token.
    capture: function (amountSar, cardToken) {
      // Print exactly what a real provider would confirm back to us.
      console.log("[payment] captured " + amountSar.toFixed(2) + " SAR with card token " + cardToken);
      // Return a receipt id. The caller can store this to prove payment happened.
      return "rcpt_" + cardToken;
    }
  };
  
  // A second provider, to prove the point. It follows the same shape.
  // We do not use it today, but adding it needed zero changes elsewhere.
  const bankTransferPayment = {
    name: "bank-transfer",
    capture: function (amountSar, reference) {
      console.log("[payment] awaiting bank transfer of " + amountSar.toFixed(2) + " SAR, reference " + reference);
      return "bank_" + reference;
    }
  };
  
  // module.exports makes these objects available to other files.
  module.exports = { cardPayment: cardPayment, bankTransferPayment: bankTransferPayment };