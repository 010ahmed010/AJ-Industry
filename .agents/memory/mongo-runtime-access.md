---
name: MongoDB runtime access
description: External MongoDB Atlas connectivity requirements for the AJ-Industry API runtime
---

The AJ-Industry API uses its existing MongoDB persistence layer. A valid connection secret alone is not sufficient: MongoDB Atlas must allow the Replit runtime's outbound network path, and TLS certificate validation must remain enabled.

**Why:** The runtime was able to resolve the Atlas replica members but received a TLS internal error from every member, which is consistent with provider-side network access or cluster policy rejecting the runtime.

**How to apply:** When authenticated client routes return a MongoServerSelectionError or TLS alert, verify Atlas Network Access and cluster availability before changing application code. Do not add `tlsAllowInvalidCertificates` or silently migrate storage.