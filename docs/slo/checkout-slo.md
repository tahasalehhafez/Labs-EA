# Service Level Objective: Northline Checkout

Owner: Huda Al-Otaibi, Checkout Team Lead
Reviewed: every quarter, next review 2026-06-01
Status: Active

---

## 1. What we measure (the SLI)

The share of checkout requests that return a successful answer in under
400 milliseconds, measured at the gateway, over a rolling 30 days.

A request counts as successful if the status code is below 500.
A 404 is a correct answer, so it counts as a success.
A 503 is our failure, so it counts as a failure.

We measure at the gateway, not inside the service, because the gateway
is closer to what the shopper actually experiences.

## 2. What we promise (the SLO)

99.5 percent, over a rolling 30 days.

## 3. What we are allowed to lose (the error budget)

100 percent minus 99.5 percent is 0.5 percent.

Northline handles roughly 400,000 checkout requests in 30 days.
0.5 percent of 400,000 is 2,000 requests.

So we may fail or be slow on up to 2,000 checkout requests every
30 days, and still be keeping our promise.

Spending this budget is allowed. It is what pays for shipping changes.

## 4. The stop rule

If more than 50 percent of the error budget is spent before day 15
of the window:

- All new feature work on Checkout stops that same day.
- The team works only on reliability until the budget recovers.
- The Checkout Team Lead informs the Head of Engineering in writing.

If the budget is fully spent:

- No deployment to Checkout except a fix for the cause, or a rollback.
- This rule cannot be waived by the Checkout team alone. It needs the
  Head of Engineering and the Product Director together.

## 5. What we do not promise

- We do not promise anything about the shipping partner's own speed.
  That is outside our control. Our promise is that we time out after
  800 milliseconds and tell the shopper clearly that no money moved.
- We do not promise 400 milliseconds for the 5 percent slowest requests.
  We promise it for 99.5 percent of all requests.

## 6. Where the numbers come from

- Live: gateway access logs, request duration field.
- Before release: the k6 script in `load/checkout-load.js`, which fails
  the build if p(95) goes above 300 milliseconds in the test environment.

## 7. Named owner

Huda Al-Otaibi is accountable for this SLO.
If Huda changes role, this document must be reassigned within one week
or it is treated as expired.