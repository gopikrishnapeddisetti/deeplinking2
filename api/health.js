const apps = require("../config/apps");

/**
 * GET /api/health
 * Returns list of configured apps and server status.
 */
module.exports = (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");

  return res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    apps: Object.entries(apps).map(([key, cfg]) => ({
      key,
      name: cfg.name,
      ios_bundle: cfg.ios.appId,
      android_package: cfg.android.package,
      fallback: cfg.fallback,
    })),
  });
};
