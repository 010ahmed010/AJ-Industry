---
name: Generated client after repository imports
description: Fresh imports can have generated source present but stale composite declaration output.
---

After importing a workspace repository, rebuild its generated API client and composite library declarations before diagnosing missing frontend exports.

**Why:** The AJ Industry repository contained the expected generated TypeScript source, but the frontend initially resolved stale declaration output until the API codegen command rebuilt the library artifacts.

**How to apply:** If a freshly imported frontend reports that generated hooks or types are not exported, run the repository's documented API codegen flow first, then rerun the app typecheck.