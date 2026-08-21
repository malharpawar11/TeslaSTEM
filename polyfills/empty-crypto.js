// Metro-only stub for Node's `crypto` module.
// @insforge/sdk has a `await import("crypto")` branch guarded by
// `typeof process.versions?.node`, which is never true in React Native,
// so this stub is never actually executed; it just satisfies Metro's
// static resolution of the dynamic import at bundle time.
module.exports = {};
