# Campfire

A cozy online campsite for a group of friends. Walk around as an avatar, chat with whoever is nearby, fish at the lake, and sit by the fire to share stories with prompt cards and a talking stick.

Friends join from a link or QR code. No accounts, no app install: it runs in any modern browser on phones and computers.

## What's in this folder

| File | What it does |
| --- | --- |
| `public/index.html` | The whole game (graphics, controls, chat, story cards) |
| `server.js` | Small Node.js server: serves the game, relays players between friends in the same campfire, and helps voice connections start |
| `package.json` | Tells Node what to install (`ws`, the WebSocket library) |
| `render.yaml` | One-click settings for free hosting on Render |

## Put it online for free (Render)

You need a free GitHub account and a free Render account. About 10 minutes the first time.

1. **Make a GitHub repo.** On github.com, click **New repository**, name it `campfire`, keep it Public or Private, and create it.
2. **Upload the files.** In the new repo, click **uploading an existing file**, drag in everything from this folder (not a `node_modules` folder if you have one), and click **Commit changes**.
3. **Create the Render service.** On render.com, sign in with GitHub, then click **New → Blueprint**, pick your `campfire` repo, and click **Apply**. Render reads `render.yaml` and sets everything up on the Free plan.
   - If you prefer the manual route: **New → Web Service**, pick the repo, Runtime **Node**, Build command `npm install`, Start command `npm start`, Instance type **Free**.
4. **Open your campsite.** When the deploy finishes, Render shows a link like `https://campfire-xxxx.onrender.com`. Open it, type your name, join, then tap **Invite** to show friends the QR code or copy the link.

Each link ends with a campfire code like `#cozy-otter-42`. Everyone with the same code is in the same campfire. **Start a new campfire** on the join screen makes a fresh code for a different group.

### Things to know about the free plan

- The server goes to sleep after 15 minutes with nobody connected. The first person to open the link after that waits about a minute while it wakes up. Once anyone is in the campsite, it stays awake.
- The free plan includes 750 hours a month, which is plenty for one always-available game.
- Nothing is saved between sessions: when everyone leaves, the campfire resets.
- Up to 12 people per campfire.

## Run it on your own computer

Needs Node.js 18 or newer.

```bash
npm install
npm start
```

Then open http://localhost:3000. Friends on the same Wi-Fi can join with your computer's local IP address, for example `http://192.168.1.20:3000`.

## Controls

| Action | Computer | Phone |
| --- | --- | --- |
| Walk | WASD or arrow keys, or click the ground | Drag anywhere (thumb joystick), or tap the ground |
| Chat | Enter, type, Enter | Type in the bar at the bottom |
| Sit, stand, fish | E or the button above the chat bar | The button above the chat bar |
| Voice | M or the mic button | The mic button, left of the chat bar |

## Voice chat

Tap the mic button to talk. The browser asks for microphone permission the first time. Voice goes directly between players' browsers (WebRTC); the server only introduces them. Friends next to you sound normal, friends farther away fade out, and everyone seated at the fire hears each other fully. Works for about 8 people. On some strict networks (certain mobile data or office Wi-Fi) two players may not connect for voice; text chat still works.

## Forest scares

Linger in the deep forest and glowing eyes start watching from the trees. Stay a few more seconds and something jumps out with a scream. It happens at most once every 90 seconds per player, and anyone can switch it off in the **?** panel (Forest scares: Off).

## Versions

See `CHANGELOG.md`. Every version is saved as a `release-vX.Y` branch, so you can always go back.

## How multiplayer works

Each player sends their position, avatar, last few chat lines and the story-circle state to the server. The server forwards changes to everyone else with the same campfire code. Each player's browser decides what to show: chat text only appears for people within earshot.
