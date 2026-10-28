# devs APK Builder

> A mobile-first Next.js web application designed to turn web content into real, signed, installable Android APKs directly from your Android phone browser without Android Studio or a local machine.

---

## ⚡ 3 End-to-End Real Conversion Pipelines

1. **Website → APK**: Convert any HTTPS website to an Android WebView application with Capacitor. Configures status bar, theme colors, splash screen, and Android runtime permissions.
2. **ZIP → APK**: Upload your static HTML/CSS/JS or build-step project (React, Vite, Next static export, Vue, Svelte). Safely extracted with zip bomb protection, path traversal guards (`../`), dependency installation (`npm ci --ignore-scripts`), build execution (`npm run build`), and packaging.
3. **PWA → APK**: Convert your Progressive Web App to a Google-compliant Trusted Web Activity (TWA) with Bubblewrap. Automatically validates manifest, 512x512 icons, and Service Workers with 1-click fallback to Capacitor WebView if TWA checks fail.

---

## 📱 Mobile-First Phone-Friendly Deployment (100% Free)

You can deploy and run this entire stack from your Android smartphone browser using free tiers:

### Step 1: Deploy Supabase (Free Database & Private Storage)
1. Open [supabase.com](https://supabase.com) on mobile and create a free project.
2. Go to **SQL Editor** -> Click **New Query**.
3. Paste the contents of `supabase/schema.sql` and tap **Run**.
4. Go to **Project Settings** -> **API** and copy:
   - `Project URL` (`SUPABASE_URL`)
   - `service_role secret key` (`SUPABASE_SERVICE_ROLE_KEY`)
   - Database connection string (`DATABASE_URL`)

### Step 2: GitHub Repository & Actions (Free Cloud Runner)
1. Fork or push this repository to your GitHub account (`https://github.com/your-username/apk-builder`).
2. Go to **Settings** -> **Secrets and variables** -> **Actions**.
3. Add the following repository secrets (Optional for custom keystore signing):
   - `ANDROID_KEYSTORE_BASE64`: Base64 encoded `.keystore` or `.p12` file (generate directly from APK Builder settings tab).
   - `ANDROID_KEYSTORE_PASSWORD`: Keystore password.
   - `ANDROID_KEY_ALIAS`: Key alias name.
   - `ANDROID_KEY_PASSWORD`: Key password.
4. Generate a GitHub Personal Access Token (PAT) with `repo` and `workflow` permissions at [github.com/settings/tokens](https://github.com/settings/tokens).

### Step 3: Deploy to Vercel (Free Serverless Hosting)
1. Go to [vercel.com](https://vercel.com) on mobile and log in with GitHub.
2. Import your `apk-builder` repository.
3. Add Environment Variables:
   - `DATABASE_URL`: Your Supabase or Postgres connection string.
   - `JWT_SECRET`: Random 32+ character string.
   - `DOWNLOAD_SIGNING_SECRET`: Random 32+ character string.
   - `ADMIN_EMAIL`: Your login email (e.g., `developer@apkbuilder.dev`).
   - `ADMIN_PASSWORD`: Your secret login password.
   - `APP_GITHUB_TOKEN`: Your GitHub PAT.
   - `APP_GITHUB_REPO`: `your-username/apk-builder`.
4. Click **Deploy**.

---

## 🔑 Generate Android Keystore from Android Phone

Generate valid RSA 2048-bit PKCS#12 Android Keystores directly in the **Settings** tab. Copy the Base64 value directly into GitHub Secrets (`ANDROID_KEYSTORE_BASE64`).

---

## 🔒 Security Architecture
- **Single User Auth**: Only you can access builds and trigger compilation.
- **SSRF Protection**: Blocks internal IP ranges (127.0.0.1, 10.x, 192.168.x, 169.254.x).
- **ZIP Limits**: Max 50MB, max 5,000 files, path traversal guard (`../`), zip bomb threshold.
- **Private Storage**: APK artifacts and source ZIPs stored in private buckets with expiring signed URLs.
- **Signed Expiring Links**: APK downloads use HMAC SHA256 tokens expiring after 60 minutes.
- **Auto-Cleanup**: Old build artifacts cleaned up after 14 days (configurable).
