---
name: MongoDB Atlas connectivity
description: Environment-specific guidance for connecting the AJ-Industry API to MongoDB Atlas.
---

MongoDB Atlas connections can resolve the replica set successfully but fail during TLS negotiation from the Replit runtime before authentication. Keep certificate validation enabled and treat the API's safe 503 response as a network/access configuration issue until the Atlas network policy allows the runtime.

**Why:** The cluster hostname resolved, but both the Node MongoDB driver and a direct TLS probe received an Atlas SSL alert before a database handshake.

**How to apply:** Check the Atlas Network Access allowlist, private endpoint requirements, and cluster availability before changing driver code or requesting new credentials. Never disable TLS certificate validation as a workaround.