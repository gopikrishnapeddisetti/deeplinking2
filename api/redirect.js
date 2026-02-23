const apps = require("../config/apps");

/**
 * Deep Link Redirect Handler
 *
 * Usage:
 *   /redirect?app=app1&path=/product/123&ref=email
 *   /link/app1/product/123?ref=email
 *
 * Query params:
 *   app   - app key from config/apps.js (required)
 *   path  - deep link path inside app (default: "/")
 *   ...   - any extra params are forwarded to the app
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

  // ── Build URLs ────────────────────────────────────────────────────────────
  const deepPath = path.startsWith("/") ? path : `/${path}`;
  const queryString = new URLSearchParams(extraParams).toString();
  const fullPath = queryString ? `${deepPath}?${queryString}` : deepPath;

  const iosSchemeUrl   = `${appConfig.ios.scheme}${fullPath.replace(/^\//, "")}`;
  const androidIntent  = buildAndroidIntent(appConfig, fullPath);
  const fallbackUrl    = `${appConfig.fallback}${fullPath}`;
  const iosStoreUrl    = appConfig.ios.storeUrl;
  const androidStoreUrl = appConfig.android.storeUrl;

  // ── Detect platform ───────────────────────────────────────────────────────
  const ua        = req.headers["user-agent"] || "";
  const isIOS     = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  // ── Respond ───────────────────────────────────────────────────────────────
  const html = buildHtml({
    appName:          appConfig.name,
    iosSchemeUrl,
    androidIntent,
    fallbackUrl,
    iosStoreUrl,
    androidStoreUrl,
    isIOS,
    isAndroid,
  });

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.send(html);
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildAndroidIntent(appConfig, fullPath) {
  // Android Intent URL format for deep linking
  return (
    `intent://${appConfig.fallback.replace(/https?:\/\//, "")}${fullPath}` +
    `#Intent;` +
    `scheme=https;` +
    `package=${appConfig.android.package};` +
    `S.browser_fallback_url=${encodeURIComponent(appConfig.android.storeUrl)};` +
    `end`
  );
}

function buildHtml({
  appName,
  iosSchemeUrl,
  androidIntent,
  fallbackUrl,
  iosStoreUrl,
  androidStoreUrl,
  isIOS,
  isAndroid,
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Opening ${appName}…</title>
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
      text-decoration: none; cursor: pointer; margin-top: 8px;
      border: none;
    }
    .btn-primary { background: #007aff; color: white; }
    .btn-secondary { background: #f2f2f7; color: #1d1d1f; }
    #status { font-size: 13px; color: #6e6e73; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner" id="spinner"></div>
    <h1>Opening ${appName}</h1>
    <p id="msg">Redirecting you to the app…</p>

    <a id="openBtn" class="btn btn-primary" href="#">Open App</a>
    <a id="storeBtn" class="btn btn-secondary" href="#" style="display:none">Get the App</a>
    <a id="webBtn"   class="btn btn-secondary" href="${fallbackUrl}" style="display:none">Continue in Browser</a>

    <p id="status"></p>
  </div>

<script>
  const isIOS     = ${isIOS};
  const isAndroid = ${isAndroid};

  const iosUrl     = ${JSON.stringify(iosSchemeUrl)};
  const androidUrl = ${JSON.stringify(androidIntent)};
  const storeUrl   = isIOS ? ${JSON.stringify(iosStoreUrl)} : ${JSON.stringify(androidStoreUrl)};
  const fallback   = ${JSON.stringify(fallbackUrl)};

  const openBtn  = document.getElementById("openBtn");
  const storeBtn = document.getElementById("storeBtn");
  const webBtn   = document.getElementById("webBtn");
  const msg      = document.getElementById("msg");
  const status   = document.getElementById("status");
  const spinner  = document.getElementById("spinner");

  const deepLink = isAndroid ? androidUrl : iosUrl;

  openBtn.href = deepLink;
  storeBtn.href = storeUrl;

  let appOpened = false;

  // If the page goes to background, the app opened successfully
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) appOpened = true;
  });
  window.addEventListener("blur", () => { appOpened = true; });

  // Attempt to open the app immediately
  window.location.href = deepLink;

  // After 2.5s, if app didn't open, show fallback options
  setTimeout(() => {
    if (!appOpened) {
      spinner.style.display = "none";
      msg.textContent = "Couldn't open the app automatically.";
      openBtn.textContent = "Try Opening App";
      storeBtn.style.display = "block";
      webBtn.style.display   = "block";
      status.textContent     = "App not installed? Download it from the store.";
    } else {
      msg.textContent = "App opened successfully!";
      spinner.style.display = "none";
    }
  }, 2500);
</script>
</body>
</html>`;
}
