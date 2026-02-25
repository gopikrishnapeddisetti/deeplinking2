const apps = require("../config/apps");

/**
 * Deep Link Redirect Handler
 *
 * Supports:
 *   /link/:app/:path*
 *   /redirect?app=zuddl&path=/game/eventId/xxx/qrcode/yyy
 *
 * Features:
 *   - Opens app directly if installed
 *   - Deferred deep linking via Play Store referrer (Android)
 *   - Deferred deep linking via clipboard (iOS)
 *   - Auto-redirects to store if app not installed
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

  // ── Parse deep link segments for deferred linking ─────────────────────────
  // e.g. /game/eventId/4ad948a6-.../qrcode/EAFPSNAB2I
  const segments     = deepPath.split("/").filter(Boolean);
  const deepLinkData = parseSegments(segments);

  // ── Build URLs ────────────────────────────────────────────────────────────
  const host            = req.headers.host || "deeplinking2.vercel.app";
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
 * Parse path segments into key-value pairs
 * Input:  ["game", "eventId", "4ad948a6-...", "qrcode", "EAFPSNAB2I"]
 * Output: { type: "game", eventId: "4ad948a6-...", qrcode: "EAFPSNAB2I" }
 */
function parseSegments(segments) {
  const data = {};
  if (segments.length === 0) return data;

  // First segment is the type (game, event, session, speaker)
  data.type = segments[0];

  // Rest are key-value pairs
  for (let i = 1; i < segments.length; i += 2) {
    const key   = segments[i];
    const value = segments[i + 1];
    if (key && value) data[key] = value;
  }

  return data;
}

/**
 * Build Android Intent URL with Play Store referrer for deferred deep linking
 *
 * When app IS installed     → opens app directly at the deep link path
 * When app is NOT installed → opens Play Store with referrer params
 *                             App reads referrer via InstallReferrerClient on first launch
 *
 * Referrer example: type=game&eventId=4ad948a6-...&qrcode=EAFPSNAB2I
 */
function buildAndroidIntent(appConfig, fullPath, deepLinkData) {
  const referrerParams = Object.entries(deepLinkData)
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
 * Build the HTML redirect page
 *
 * Android flow:
 *   1. Tries Intent URL → opens app if installed
 *   2. Not installed → Play Store opens with referrer (type, eventId, qrcode etc.)
 *   3. After install, app reads referrer via InstallReferrerClient
 *
 * iOS flow:
 *   1. Tries custom scheme → opens app if installed
 *   2. Not installed → copies full deep link URL to clipboard
 *   3. Redirects to App Store after 2s
 *   4. After install, app reads clipboard on first launch
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

  // Full deep link URL — copied to clipboard for iOS deferred deep linking
  // App reads this from clipboard on first launch after install
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
  // Use visibilitychange ONLY — window.blur causes false positives on iOS
  // when scheme is not registered (Safari flickers briefly)
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      // Page hidden = app may have opened, confirm after 300ms
      visibilityDelay = setTimeout(() => { appOpened = true; }, 300);
    } else {
      // Page came back quickly = false positive, cancel
      if (visibilityDelay) clearTimeout(visibilityDelay);
    }
  });

  // ── iOS clipboard helper ──────────────────────────────────────────────────
  // Copies the full deep link URL to clipboard so the app can read it
  // on first launch via UIPasteboard (deferred deep linking)
  function copyDeepLinkToClipboard() {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(deepLinkUrl).catch(() => fallbackCopy());
      } else {
        fallbackCopy();
      }
    } catch(e) { /* clipboard not available, silently fail */ }
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

  // ── Step 1: Attempt to open app immediately ───────────────────────────────
  window.location.href = deepLink;

  // ── Step 2: After 3s, check result ───────────────────────────────────────
  setTimeout(() => {
    if (!appOpened) {

      // App is NOT installed
      spinner.style.display  = "none";
      msg.textContent        = "Couldn't open the app automatically.";
      openBtn.textContent    = "Try Opening App";
      storeBtn.style.display = "block";
      webBtn.style.display   = "block";

      if (isIOS) {
        // ── iOS Deferred Deep Linking ───────────────────────────────────────
        // 1. Copy deep link URL to clipboard
        // 2. App reads clipboard on first launch → navigates to correct screen
        copyDeepLinkToClipboard();

        status.textContent = "Redirecting to App Store in 2 seconds...";

        // Auto redirect to App Store
        setTimeout(() => {
          if (!appOpened) window.location.href = storeUrl;
        }, 2000);

      } else if (isAndroid) {
        // ── Android Deferred Deep Linking ──────────────────────────────────
        // Referrer params already embedded in Intent URL fallback_url
        // Play Store passes them to app → app reads via InstallReferrerClient
        // e.g. type=game&eventId=4ad948a6-...&qrcode=EAFPSNAB2I
        status.textContent = "App not installed? Download it from the store.";

      } else {
        status.textContent = "Please open this link on your mobile device.";
      }

    } else {
      // App IS installed — opened successfully
      msg.textContent       = "App opened successfully!";
      spinner.style.display = "none";
    }
  }, 3000);
</script>
</body>
</html>`;
}