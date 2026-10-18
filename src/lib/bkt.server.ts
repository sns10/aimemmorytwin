// Server-side entry point for the cognitive math. The implementation lives in
// bkt.core.ts as a pure module so the /engine portal can render the very same
// functions in the browser; this file keeps the existing server import path.
export * from "./bkt.core";
