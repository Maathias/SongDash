# SongDash

A multiplayer party game based on "Jaka to melodia" (Name that Tune). Players compete to identify songs by pressing a button on their phones, pausing the music and entering a queue to guess.

## How It Works

The game requires four components:

1. **Server** - Runs on the same machine playing music, controlling playback via OS media protocols
2. **Host** - Verifies answers, awards points, and manages game flow
3. **TV Display** - Shows play/pause status and the queue of who buzzed in first
4. **Players** - Join via their phones with a simple interface: nickname, score, and a button to buzz in

When a player presses their button, the music pauses and they join the queue. The host determines if their answer is correct and awards points accordingly. Network delay on local WiFi is minimal and negligible compared to human reaction time.

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Modifications:

	For customizations, look at `.env.example` for possible values, and change them in `.env` before launching

   IMPORTANT: for a working QR code generation, create a `.env` file with at least `SERVER_HOST`

4. Start the server:

   ```bash
   pnpm start
   ```

5. Open the interfaces:
   - Host: `http://<ip-address>:2500/host.html`
   - TV: `http://<ip-address>:2500/tv.html`
   - Players: `http://<ip-address>:2500/player.html`

## Technical Details

Written in vanilla HTML/CSS/JavaScript. May be ported to TypeScript if complexity increases. Currently media assets (images, sounds) are not included in the repository to avoid copyright issues. The plan is to support custom assets in a designated folder for things like button textures, backgrounds, and sound effects.

### Requirements

- Node.js
- A media player running on the server machine
- All devices on the same network

### Architecture

The server controls media playback through system-level APIs:

- **Linux**: D-Bus MPRIS2 (Spotify, VLC, Rhythmbox, etc.)
- **macOS**: AppleScript (Spotify, Music)
- **Windows**: GlobalSystemMediaTransportControls

Communication happens over HTTP (port 2500) for serving pages and WebSockets (port 2501) for real-time state updates.
