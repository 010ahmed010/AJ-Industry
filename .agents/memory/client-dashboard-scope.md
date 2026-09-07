---
name: Client dashboard scope
description: Current boundary between the client portal UI and future account-backed data.
---

The client portal is currently a functional frontend surface with local profile/preferences state and realistic project data, while authentication, persisted client records, project files, and live progress remain future server-backed work.

**Why:** The workspace has no client-auth or client-project API contract yet, but the requested dashboard needed usable navigation and interactions now.

**How to apply:** When adding auth or client APIs, replace local demo state with user-scoped queries and mutations while preserving the existing `/client` route structure and dashboard information architecture.