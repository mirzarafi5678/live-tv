# Live TV

A React application for watching a live sports stream using HLS.js, with a Vite development server and an auxiliary Express streaming proxy.

[Deployed site](https://live-tv-iota.vercel.app/)

## Requirements

- Node.js 24 LTS (setup validated with Node.js 24.19.0 and npm 11.9.0).
- Network access to the npm registry for installation and `tv.alii.uk` for streaming.

## Install

Run commands from the repository root:

```bash
npm ci
```

In the Codex cloud environment, the checkout is at `/workspace/live-tv`. Use that existing checkout; no additional Git worktree is needed.

## Run locally

Start Vite:

```bash
npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
```

Start the streaming proxy in a separate terminal:

```bash
node proxy-server.js
```

The development server uses port 5173 and the proxy uses port 3001. Stop either process with Ctrl+C in its terminal.

The player currently requests its manifest directly from `tv.alii.uk` and rewrites matching fragment URLs to `http://localhost:3001/proxy`. The proxy must therefore be reachable from the browser on that address. When accessing the app from another machine, `localhost` refers to the browser's machine; the current source requires changes to support that arrangement. Vite also defines an `/api/stream` proxy, but the player does not currently use it.

## Build and check

```bash
npm run build
npm run lint
```

The production build is written to `dist/`. To inspect the built frontend:

```bash
npm run preview
```

Previewing the frontend does not start the streaming proxy.

There is no automated test script. For a development smoke check while Vite is running:

```bash
curl --fail http://127.0.0.1:5173/
curl --fail http://127.0.0.1:5173/src/App.jsx
```

The first request should return the HTML containing the root element; the second should return transformed React code. These checks do not validate video playback.

## Known limitations

- The production build passed during cloud setup, with a warning about a JavaScript chunk exceeding 500 kB.
- Lint currently fails with four existing unused-variable errors: two `res` parameters in `proxy-server.js`, plus `setTheater` and the catch variable `e` in `src/App.jsx`.
- Playback depends on an external stream URL defined in `src/App.jsx`. Its availability, CORS behavior, and validity are outside this repository's control.
- During cloud setup, the external manifest request was blocked with a network-policy 403, and the local streaming proxy returned 500. Video playback has not been verified. The saved environment draft includes `tv.alii.uk`; review and save the settings, publish the environment, and retry playback after the policy is applied.
