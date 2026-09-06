---
name: Service gallery content
description: Durable content-model decision for service project galleries and future admin editing.
---

Service galleries are modeled as variable-length content on each service detail record rather than as a fixed frontend-only layout.

**Why:** The number of projects must remain editable later from an admin panel, while the current release only needs test projects and no admin UI.

**How to apply:** Preserve the gallery array and its bilingual image/title/description shape when adding admin CRUD or replacing the temporary project media.