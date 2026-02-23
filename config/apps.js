/**
 * White Label App Configuration
 */
const apps = {

  /**
   * Quantum Leap 2026
   * iOS:     https://apps.apple.com/us/app/quantum-leap-2026/id6758663541
   * Android: https://play.google.com/store/apps/details?id=com.zuddl.quantumleap2026
   *
   * TODO: Replace TEAMID_QL with your Apple Team ID (10-char string from developer.apple.com)
   * TODO: Replace sha256 with value from Play Console → Setup → App Integrity
   * TODO: Set scheme to whatever is registered in your app (e.g. "quantumleap://")
   * TODO: Set fallback to your web URL or keep store URL as fallback
   */
  quantumleap: {
    name: "Quantum Leap 2026",
    ios: {
      appId: "TEAMID_QL.com.zuddl.quantumleap2026",   // ← replace TEAMID_QL
      scheme: "quantumleap2026://",                     // ← confirm with your iOS dev
      storeUrl: "https://apps.apple.com/us/app/quantum-leap-2026/id6758663541",
    },
    android: {
      package: "com.zuddl.quantumleap2026",
      sha256: "REPLACE_WITH_SHA256_FROM_PLAY_CONSOLE",  // ← optional, needed for App Links
      storeUrl: "https://play.google.com/store/apps/details?id=com.zuddl.quantumleap2026",
    },
    fallback: "https://apps.apple.com/us/app/quantum-leap-2026/id6758663541",
  },

  /**
   * Zuddl Events (Portal)
   * iOS:     https://apps.apple.com/us/app/zuddl-events/id6450897791
   * Android: https://play.google.com/store/apps/details?id=com.zuddl.portal
   *
   * TODO: Replace TEAMID_ZE with your Apple Team ID
   * TODO: Replace sha256 with value from Play Console → Setup → App Integrity
   * TODO: Set scheme to whatever is registered in your app (e.g. "zuddl://")
   */
  zuddl: {
    name: "Zuddl Events",
    ios: {
      appId: "TEAMID_ZE.com.zuddl.portal",             // ← replace TEAMID_ZE
      scheme: "zuddl://",                               // ← confirm with your iOS dev
      storeUrl: "https://apps.apple.com/us/app/zuddl-events/id6450897791",
    },
    android: {
      package: "com.zuddl.portal",
      sha256: "REPLACE_WITH_SHA256_FROM_PLAY_CONSOLE",  // ← optional, needed for App Links
      storeUrl: "https://play.google.com/store/apps/details?id=com.zuddl.portal",
    },
    fallback: "https://zuddl.com",
  },

};

module.exports = apps;
