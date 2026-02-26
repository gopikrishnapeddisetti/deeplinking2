const apps = require("../config/apps");

/**
 * Deep Link Redirect Handler
 *
 * URL Pattern:
 *   /link/{appId}/{eventId}/{type}/{qrCode}
 *
 * Example:
 *   /link/com.zuddl.quantumleap2026/4ad948a6-5171-4446-9795-bd6386baa0f6/game/EAFPSNAB2I
 *
 * Segments:
 *   [0] = "link"
 *   [1] = appId    → "com.zuddl.quantumleap2026" or "com.zuddl.portal"
 *   [2] = eventId  → "4ad948a6-5171-4446-9795-bd6386baa0f6"
 *   [3] = type     → "game", "event", "session", "speaker"
 *   [4] = qrCode   → "EAFPSNAB2I" (optional)
 */
module.exports = (req, res) => {
  const { app, path = "/", ...extraParams } = req.query;

  // ── Validate app ──────────────────────────────────────────────────────────
  if (!app) {
    return res.status(400).json({ error: "Missing required param: app" });
  }

  const appConfig = apps[app];
  if (!appConfig) {
    return res.status(404).json({
      error: `App "${app}" not found`,
      available: Object.keys(apps),
    });
  }

  // ── Build full path ───────────────────────────────────────────────────────
  const deepPath    = path.startsWith("/") ? path : `/${path}`;
  const queryString = new URLSearchParams(extraParams).toString();
  const fullPath    = queryString ? `${deepPath}?${queryString}` : deepPath;

  // ── Parse new URL pattern for deferred deep linking ───────────────────────
  // deepPath = /{eventId}/{type}/{qrCode}
  // e.g.     = /4ad948a6-.../game/EAFPSNAB2I
  const segments     = deepPath.split("/").filter(Boolean);
  const deepLinkData = parseSegments(segments, app);

  // ── Build URLs ────────────────────────────────────────────────────────────
  const host            = req.headers.host || "applink.zuddl.com";
  const fullDeepLinkUrl = `https://${host}/link/${app}${deepPath}`;
  const iosSchemeUrl    = `${appConfig.ios.scheme}${fullPath.replace(/^\//, "")}`;
  const androidIntent   = buildAndroidIntent(appConfig, fullPath, deepLinkData);
  const fallbackUrl     = `${appConfig.fallback}${fullPath}`;
  const iosStoreUrl     = appConfig.ios.storeUrl;
  const androidStoreUrl = appConfig.android.storeUrl;

  // ── Detect platform ───────────────────────────────────────────────────────
  const ua        = req.headers["user-agent"] || "";
  const isIOS     = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  // ── Respond ───────────────────────────────────────────────────────────────
  const html = buildHtml({
    appName: appConfig.name,
    iosSchemeUrl,
    androidIntent,
    fallbackUrl,
    iosStoreUrl,
    androidStoreUrl,
    isIOS,
    isAndroid,
    fullDeepLinkUrl,
  });

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.send(html);
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse new URL pattern segments
 *
 * New pattern: /link/{appId}/{eventId}/{type}/{qrCode}
 * deepPath segments (after splitting /link/{appId}):
 *   [0] = eventId  → "4ad948a6-5171-4446-9795-bd6386baa0f6"
 *   [1] = type     → "game"
 *   [2] = qrCode   → "EAFPSNAB2I" (optional)
 *
 * Returns flat object for Play Store referrer:
 *   { appId, eventId, type, qrCode }
 */
function parseSegments(segments, appId) {
  const data = { appId };

  // segments = ["eventId-uuid", "game", "EAFPSNAB2I"]
  if (segments[0]) data.eventId = segments[0];  // 4ad948a6-...
  if (segments[1]) data.type    = segments[1];  // game
  if (segments[2]) data.qrCode  = segments[2];  // EAFPSNAB2I

  return data;
}

/**
 * Build Android Intent URL
 *
 * App installed     → opens DeepLinkActivity directly
 * App not installed → Play Store opens with referrer:
 *                     appId=com.zuddl.quantumleap2026&eventId=4ad948a6-...&type=game&qrCode=EAFPSNAB2I
 *
 * Android reads referrer via InstallReferrerClient on first launch
 */
function buildAndroidIntent(appConfig, fullPath, deepLinkData) {
  // Build referrer from parsed data
  // e.g. appId=com.zuddl.quantumleap2026&eventId=4ad948a6-...&type=game&qrCode=EAFPSNAB2I
  const referrerParams = Object.entries(deepLinkData)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const storeUrlWithReferrer = referrerParams
    ? `${appConfig.android.storeUrl}&referrer=${encodeURIComponent(referrerParams)}`
    : appConfig.android.storeUrl;

  return (
    `intent://${appConfig.fallback.replace(/https?:\/\//, "")}${fullPath}` +
    `#Intent;` +
    `scheme=https;` +
    `package=${appConfig.android.package};` +
    `S.browser_fallback_url=${encodeURIComponent(storeUrlWithReferrer)};` +
    `end`
  );
}

/**
 * Build HTML redirect page
 *
 * Android flow:
 *   App installed     → Intent URL opens DeepLinkActivity
 *   App not installed → Play Store with referrer params
 *                     → InstallReferrerClient reads: appId, eventId, type, qrCode
 *
 * iOS flow:
 *   App installed     → Universal Link opens app via onOpenURL
 *   App not installed → Copies full URL to clipboard
 *                     → Redirects to App Store after 2s
 *                     → App reads clipboard on first launch
 */
function buildHtml({
  appName,
  iosSchemeUrl,
  androidIntent,
  fallbackUrl,
  iosStoreUrl,
  androidStoreUrl,
  isIOS,
  isAndroid,
  fullDeepLinkUrl,
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Opening ${appName}...</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; min-height: 100vh;
      background: #f5f5f7; color: #1d1d1f; text-align: center; padding: 24px;
    }
    .card {
      background: white; border-radius: 18px; padding: 40px 32px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08); max-width: 400px; width: 100%;
    }
    h1  { font-size: 22px; font-weight: 600; margin-bottom: 8px; }
    p   { font-size: 15px; color: #6e6e73; margin-bottom: 24px; }
    .spinner {
      width: 40px; height: 40px; border: 3px solid #e5e5ea;
      border-top-color: #007aff; border-radius: 50%;
      animation: spin 0.8s linear infinite; margin: 0 auto 24px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .btn {
      display: inline-block; width: 100%; padding: 14px;
      border-radius: 12px; font-size: 16px; font-weight: 500;
      text-decoration: none; cursor: pointer; margin-top: 8px; border: none;
    }
    .btn-primary   { background: #007aff; color: white; }
    .btn-secondary { background: #f2f2f7; color: #1d1d1f; }
    #status { font-size: 13px; color: #6e6e73; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner" id="spinner"></div>
    <h1>Opening ${appName}</h1>
    <p id="msg">Redirecting you to the app...</p>

    <a id="openBtn"  class="btn btn-primary"   href="#">Open App</a>
    <a id="storeBtn" class="btn btn-secondary" href="#" style="display:none">Get the App</a>
    <a id="webBtn"   class="btn btn-secondary" href="${fallbackUrl}" style="display:none">Continue in Browser</a>

    <p id="status"></p>
  </div>

<script>
  const isIOS      = ${isIOS};
  const isAndroid  = ${isAndroid};
  const iosUrl     = ${JSON.stringify(iosSchemeUrl)};
  const androidUrl = ${JSON.stringify(androidIntent)};
  const storeUrl   = isIOS ? ${JSON.stringify(iosStoreUrl)} : ${JSON.stringify(androidStoreUrl)};
  const fallback   = ${JSON.stringify(fallbackUrl)};

  // Full URL stored in clipboard for iOS deferred deep linking
  // Pattern: https://applink.zuddl.com/link/{appId}/{eventId}/{type}/{qrCode}
  // App reads this from UIPasteboard on first launch → navigates to correct screen
  const deepLinkUrl = ${JSON.stringify(fullDeepLinkUrl)};

  const openBtn  = document.getElementById("openBtn");
  const storeBtn = document.getElementById("storeBtn");
  const webBtn   = document.getElementById("webBtn");
  const msg      = document.getElementById("msg");
  const status   = document.getElementById("status");
  const spinner  = document.getElementById("spinner");

  const deepLink = isAndroid ? androidUrl : iosUrl;

  openBtn.href  = deepLink;
  storeBtn.href = storeUrl;

  let appOpened       = false;
  let visibilityDelay = null;

  // ── App open detection ────────────────────────────────────────────────────
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      visibilityDelay = setTimeout(() => { appOpened = true; }, 300);
    } else {
      if (visibilityDelay) clearTimeout(visibilityDelay);
    }
  });

  // ── iOS clipboard for deferred deep linking ───────────────────────────────
  function copyDeepLinkToClipboard() {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(deepLinkUrl).catch(() => fallbackCopy());
      } else {
        fallbackCopy();
      }
    } catch(e) {}
  }

  function fallbackCopy() {
    try {
      const el = document.createElement("textarea");
      el.value = deepLinkUrl;
      el.style.cssText = "position:fixed;opacity:0;top:0;left:0;";
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    } catch(e) {}
  }

  // ── Step 1: Try to open app ───────────────────────────────────────────────
  window.location.href = deepLink;

  // ── Step 2: After 3s check if app opened ─────────────────────────────────
  setTimeout(() => {
    if (!appOpened) {

      spinner.style.display  = "none";
      msg.textContent        = "Couldn't open the app automatically.";
      openBtn.textContent    = "Try Opening App";
      storeBtn.style.display = "block";
      webBtn.style.display   = "block";

      if (isIOS) {
        // Copy full URL to clipboard
        // App reads on first launch via UIPasteboard
        // Parses: /link/{appId}/{eventId}/{type}/{qrCode}
        copyDeepLinkToClipboard();
        status.textContent = "Redirecting to App Store in 2 seconds...";
        setTimeout(() => {
          if (!appOpened) window.location.href = storeUrl;
        }, 2000);

      } else if (isAndroid) {
        // Referrer already in Intent URL fallback
        // Play Store passes to app on install
        // InstallReferrerClient reads: appId, eventId, type, qrCode
        status.textContent = "App not installed? Download it from the store.";

      } else {
        status.textContent = "Please open this link on your mobile device.";
      }

    } else {
      msg.textContent       = "App opened successfully!";
      spinner.style.display = "none";
    }
  }, 3000);
</script>
</body>
</html>`;
}
