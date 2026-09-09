# Northline Shop - Context Map

A bounded context is a boundary where one word has exactly one meaning.
Two contexts may use the same word differently. That is fine, as long as
we write it down here and translate at the border.

We start with two contexts. More will follow later.

---

## Context 1: Catalog

Owner: Catalog Team
Purpose: describe what we sell.

| Word     | What it means inside Catalog                                        |
|----------|---------------------------------------------------------------------|
| item     | A product we sell. It has a name, a description and photos. It exists even when nobody has bought it. Identified by `sku`. |
| price    | The list price shown on the product page. One currency: SAR. Excludes VAT. Excludes any discount. |
| customer | Almost nothing. Only a country code, used to decide which items may be shown. Catalog has no name, no email, no address. |

What Catalog promises to others:

- `GET /v1/items/{id}` returns the item or a clear 404.
- The `sku` never changes for the life of the product.

---

## Context 2: Checkout

Owner: Checkout Team
Purpose: take money correctly.

| Word     | What it means inside Checkout                                        |
|----------|---------------------------------------------------------------------|
| item     | A line on an order. It is a frozen copy of the product name and the price at the second the shopper paid. If Catalog changes the price tomorrow, this line does not change. |
| price    | The amount actually charged for that line. Includes the discount. Excludes VAT, which is added once for the whole order. |
| customer | A real person with a name, an email, a billing address and a payment token. Checkout must protect this data. |

What Checkout promises to others:

- It publishes one event called `PaymentCaptured` when money is taken.
- The event carries `order_id`, `sku`, `quantity` and `event_id`.

---

## The border between them

The word `item` is the dangerous one.

- In Catalog, an item is a living product. Change it and every page changes.
- In Checkout, an item is a receipt line. It must never change again.

Rule: Checkout copies the values it needs from Catalog at the moment of
purchase. Checkout never reads the Catalog database. Checkout never
assumes the Catalog price today equals the price on the receipt.

The word `price` is the second dangerous one.

- Catalog price excludes discount.
- Checkout price includes discount.

Rule: whenever these two numbers appear in the same conversation, we say
`catalog list price` or `charged line price`. We never say only `price`.

---

## Relationship type

Catalog is upstream. Checkout is downstream.
Checkout adapts to Catalog through the published API contract in
`api/openapi.yaml`. Catalog does not change that contract without a
version bump and four weeks of notice.