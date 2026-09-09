# Northline Shop — Architecture Modernisation

Northline Shop is an online retailer in Riyadh.
One old system from 2011, called NorthlineCore, does catalog, cart,
checkout, stock and shipping. We are splitting it apart, carefully.

## How to run anything here

The only tool you need is Docker Desktop.
Nothing else is installed on your machine.

## What lives where

- docs/      diagrams and written decisions
- api/       the written promise between teams (OpenAPI)
- services/  the new small services (catalog, checkout, warehouse)
- gateway/   the traffic policeman that routes old and new
- load/      the load test
- fitness/   automatic tests of our architecture rules

## Rule we never break

No real password, key or token is ever written in a file here.
We always write a placeholder such as ${DB_PASSWORD} instead.

DATABASE_URL=postgres://admin:${DB_PASSWORD}@db.northline.local:5432/shop
# DATABASE_URL=postgres://admin:Riyadh2011!@db.northline.local:5432/shop



Context — what was true at the time, and what forced us to choose.
Decision — what we chose, in one sentence, in the present tense.
Consequences — what gets better, and what gets worse. Both. Always both.
Status — Proposed, Accepted, or Superseded (meaning a later ADR replaced it).

