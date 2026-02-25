/**
 * White Label App Configuration
 *
 * Supports two URL formats:
 *   /link/zuddl/game/eventId/xxx          → short key
 *   /link/com.zuddl.portal/game/eventId/xxx → package name key
 */
const apps = {

  // ── Quantum Leap 2026 ──────────────────────────────────────────────────────

  // Short key  → /link/quantumleap/game/eventId/xxx
  "quantumleap": {
    name: "Quantum Leap 2026",
    fallback: "https://play.google.com/store/apps/details?id=com.zuddl.quantumleap2026",
    ios: {
      appId:    "TEAMID_QL.com.zuddl.quantumleap2026",
      scheme:   "quantumapp://",
      storeUrl: "https://apps.apple.com/us/app/quantum-leap-2026/id6758663541",
    },
    android: {
      package:  "com.zuddl.quantumleap2026",
      storeUrl: "https://play.google.com/store/apps/details?id=com.zuddl.quantumleap2026",
    },
  },

  // Package name key → /link/com.zuddl.quantumleap2026/game/eventId/xxx
  "com.zuddl.quantumleap2026": {
    name: "Quantum Leap 2026",
    fallback: "https://play.google.com/store/apps/details?id=com.zuddl.quantumleap2026",
    ios: {
      appId:    "TEAMID_QL.com.zuddl.quantumleap2026",
      scheme:   "quantumapp://",
      storeUrl: "https://apps.apple.com/us/app/quantum-leap-2026/id6758663541",
    },
    android: {
      package:  "com.zuddl.quantumleap2026",
      storeUrl: "https://play.google.com/store/apps/details?id=com.zuddl.quantumleap2026",
    },
  },

  // ── Zuddl Events (Portal) ──────────────────────────────────────────────────

  // Short key  → /link/zuddl/game/eventId/xxx
  "zuddl": {
    name: "Zuddl Events",
    fallback: "https://play.google.com/store/apps/details?id=com.zuddl.portal",
    ios: {
      appId:    "TEAMID_ZE.com.zuddl.portal",
      scheme:   "zuddlapp://",
      storeUrl: "https://apps.apple.com/us/app/zuddl-events/id6450897791",
    },
    android: {
      package:  "com.zuddl.portal",
      storeUrl: "https://play.google.com/store/apps/details?id=com.zuddl.portal",
    },
  },

  // Package name key → /link/com.zuddl.portal/game/eventId/xxx
  "com.zuddl.portal": {
    name: "Zuddl Events",
    fallback: "https://play.google.com/store/apps/details?id=com.zuddl.portal",
    ios: {
      appId:    "TEAMID_ZE.com.zuddl.portal",
      scheme:   "zuddlapp://",
      storeUrl: "https://apps.apple.com/us/app/zuddl-events/id6450897791",
    },
    android: {
      package:  "com.zuddl.portal",
      storeUrl: "https://play.google.com/store/apps/details?id=com.zuddl.portal",
    },
  },

};

module.exports = apps;
