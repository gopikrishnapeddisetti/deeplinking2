# Deep Link Server — Vercel

White-label deep link server supporting multiple iOS & Android apps. Deployed on Vercel with zero infrastructure overhead.

---

## Directory Structure

```
deeplink-server/
├── api/
│   ├── redirect.js          ← Main deep link handler
│   └── health.js            ← Health check & app list
├── config/
│   └── apps.js              ← ⭐ White-label app configs (edit this)
├── public/
│   ├── index.html           ← Landing page
│   └── .well-known/
│       ├── apple-app-site-association   ← iOS Universal Links
│       └── assetlinks.json              ← Android App Links
├── vercel.json              ← Routing & headers
├── package.json
└── README.md
```

---

## Setup

### 1. Configure your apps

Edit `config/apps.js` and add your white-label apps:

```js
app1: {
  name: "My App",
  ios: {
    appId: "TEAMID.com.yourcompany.app1",  // From Apple Developer portal
    scheme: "myapp://",
    storeUrl: "https://apps.apple.com/app/id...",
  },
  android: {
    package: "com.yourcompany.app1",
    sha256: "AA:BB:CC:...",                // From Play Console or keytool
    storeUrl: "https://play.google.com/store/apps/details?id=...",
  },
  fallback: "https://app1.yourcompany.com",
}
```

### 2. Update `.well-known` files

- `apple-app-site-association` → replace `appID` values with your Team ID + Bundle ID
- `assetlinks.json` → replace `package_name` and `sha256_cert_fingerprints`

### 3. Deploy to Vercel

```bash
npm install
npx vercel --prod
```

---

## URL Formats

| Format | Example |
|--------|---------|
| Query params | `/redirect?app=app1&path=/product/123&ref=email` |
| Clean URL | `/link/app1/product/123?ref=email` |
| Health check | `/health` |

---

## iOS Setup (Universal Links)

1. In Xcode → Signing & Capabilities → **Associated Domains**
2. Add: `applinks:your-vercel-app.vercel.app`
3. Make sure your AASA file is reachable at `/.well-known/apple-app-site-association`

## Android Setup (App Links)

In `AndroidManifest.xml`:

```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https"
        android:host="your-vercel-app.vercel.app"
        android:pathPrefix="/link/app1" />
</intent-filter>
```

---

## Get SHA256 Fingerprint (Android)

```bash
keytool -list -v -keystore your-release.keystore -alias your-alias
```

Or from Play Console → Setup → App Integrity → App signing key certificate.

---

## Custom Domains (per white-label app)

If each white-label app has its own domain, deploy this project once and map multiple Vercel domains to it. Each domain's `assetlinks.json` and `apple-app-site-association` must be accessible at the root.

Alternatively, use Vercel's **rewrites** to host each app's well-known files from a single deployment with domain-based routing.
