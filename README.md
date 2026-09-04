# Veylo

> Small actions, better days.

Veylo is a calm habit tracker with a structured local planner. It helps you build realistic routines, complete daily habits, review consistency, and adjust goals without requiring an account or cloud service.

## Features

- Compact daily habit list with completion, undo, streaks, reminders, reordering, editing, archiving, and deletion
- Monthly consistency calendar with completion intensity and daily history
- Real progress statistics calculated from stored habit records
- Rule-based local planner that creates sustainable routines
- Adaptive suggestions that recommend gentler goals when a habit is frequently missed
- Five calm color themes with Light, Dark, and System modes
- Local data persistence and JSON export
- Installable Progressive Web App with offline caching after the first visit

## Technology

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- Framer Motion
- Lucide icons
- Browser local storage for on-device data
- Web App Manifest and Service Worker for installation and offline access

## Run Locally

Install Node.js 20 or newer, then run:

```bash
git clone https://github.com/YOUR-USERNAME/veylo.git
cd veylo
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## Production Build

```bash
npm install
npm run build
```

The production app is generated in `dist/`. Preview it locally with:

```bash
npm run preview
```

## Create The GitHub Repository

1. Sign in to GitHub.
2. Select **New repository**.
3. Name the repository `veylo`.
4. Do not initialize it with a README, `.gitignore`, or license because these files are already included.
5. Create the repository.
6. From this project directory, run the following commands.

```bash
git init
git add .
git commit -m "Initial Veylo release"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/veylo.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your GitHub username.

For future updates:

```bash
git add .
git commit -m "Describe your update"
git push
```

## Publish With GitHub Pages

This repository includes `.github/workflows/deploy-pages.yml`. It builds and publishes Veylo whenever code is pushed to `main`.

1. Push the project to GitHub.
2. Open the repository on GitHub.
3. Go to **Settings > Pages**.
4. Under **Build and deployment**, select **GitHub Actions** as the source.
5. Open the **Actions** tab and wait for `Deploy Veylo to GitHub Pages` to finish.
6. Visit `https://YOUR-USERNAME.github.io/veylo/`.

If the repository has a different name, replace `veylo` in the URL with that repository name.

## Install On Android

Once GitHub Pages is enabled:

1. Open the GitHub Pages URL in Chrome on Android.
2. Tap the Chrome menu.
3. Select **Install app** or **Add to Home screen**.
4. Confirm the installation.
5. Launch Veylo from the Android home screen.

After the first successful visit, the service worker caches the app for offline use. Habit data remains in that browser installation on the device.

## Can Someone Install It By Downloading From GitHub?

Not directly from the repository source ZIP. Android cannot install React, TypeScript, or the `dist` folder as an application package.

There are two practical delivery choices:

1. **GitHub Pages:** users open the published URL in Android Chrome and install Veylo as a Progressive Web App. No APK download is required.
2. **GitHub Releases:** users can download and install from GitHub only if you build a real Android APK and upload `Veylo.apk` to a GitHub Release.

This repository currently builds a web/PWA release, not a native Android APK. Do not rename a ZIP or HTML file to `.apk`; Android will reject it. A native APK requires a separate Android build using Kotlin and Jetpack Compose, or an Android wrapper. If strict native Android behavior is required, use the Kotlin/Compose route rather than a WebView wrapper.

## Upload An APK To GitHub Releases

After an Android build produces a genuine signed APK:

1. Open the repository on GitHub.
2. Select **Releases**.
3. Select **Draft a new release**.
4. Create a tag such as `v1.0.0`.
5. Upload the signed file as `Veylo.apk`.
6. Publish the release.

Android users can then open the release page, download `Veylo.apk`, allow installation from that browser when prompted, and install it.

## Data And Privacy

Veylo does not require login credentials. Habit records, settings, planner preferences, and completion history are stored locally in the browser. Clearing browser site data or uninstalling the PWA can remove this data, so use the JSON export in Settings before clearing or moving devices.

## Project Structure

```text
src/
  components/     Shared interface components and sheets
  lib/            Data store, planner rules, statistics, dates, and types
  screens/        Today, Calendar, Progress, Planner, and Settings
public/
  icons/          Launcher icons
  manifest.webmanifest
  sw.js           Offline service worker
.github/workflows/
  deploy-pages.yml
```