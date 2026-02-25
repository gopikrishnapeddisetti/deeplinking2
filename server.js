"use strict";

const express = require("express");
const path    = require("path");

const redirectHandler = require("./api/redirect");
const healthHandler   = require("./api/health");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Static files (public/) ────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "public")));

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/health", healthHandler);

// ── Redirect via query params: /redirect?app=zuddl&path=/game/... ─────────────
app.get("/redirect", redirectHandler);

// ── Clean URL: /link/:app/:path*  →  /redirect?app=:app&path=/:path* ─────────
app.get("/link/:app/*", (req, res) => {
  const appKey   = req.params.app;
  const deepPath = "/" + (req.params[0] || "");

  // Merge into req.query so the redirect handler reads them transparently
  req.query.app  = appKey;
  req.query.path = deepPath;

  return redirectHandler(req, res);
});

// ── 404 fallback ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Deep link server listening on port ${PORT}`);
});
