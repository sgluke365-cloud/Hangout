# Campfire

A cozy online campsite for a group of friends. Walk around as an avatar, chat with whoever is nearby, fish at the lake, sit by the fire to share stories with prompt cards and a talking stick, see who can roast the best s'more, find the old church hidden in the forest, and wake the campfire spirit, a talking fire that tells stories and chats with everyone around it.

Friends join from a link or QR code. No accounts, no app install: it runs in any modern browser on phones and computers.

## What's in this folder

| File | What it does |
| --- | --- |
| `public/index.html` | The whole game (graphics, controls, chat, story cards) |
| `public/spirit-brain.js` | Ember, the campfire spirit: its personality, how it's asked things, and its storybook for when there's no AI |
| `server.js` | Small Node.js server: serves the game, relays players between friends in the same campfire, helps voice connections start, and passes questions for Ember to Claude |
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
| Sit, stand, fish, go in or out of the church | E or the button above the chat bar | The button above the chat bar |
| Voice | M or the mic button | The mic button, left of the chat bar |
| Start or join a s'mores round | R, or click **Roast s'mores** / **Grab a stick!** | Tap **Roast s'mores** / **Grab a stick!** |
| Roast | Click and hold **Hold to roast** with the mouse, or hold Space | Press and hold **Hold to roast** |
| Serve | Click **Serve!**, or press F | Tap **Serve!** |
| Wake the fire | Click **Wake the fire** at the fire | Tap **Wake the fire** |
| Sing the fire's song | Click the stones, or press 1 to 5 | Tap the stones |
| Talk to Ember | Type in Ember's panel, or start a chat message with "Ember,". Press T or click Ember's mic to speak | Type in Ember's panel, or tap Ember's mic and speak |

## Voice chat

Tap the mic button to talk. The browser asks for microphone permission the first time. Voice goes directly between players' browsers (WebRTC); the server only introduces them. Friends next to you sound normal, friends farther away fade out, and everyone seated at the fire hears each other fully. Works for about 8 people. On some strict networks (certain mobile data or office Wi-Fi) two players may not connect for voice; text chat still works.

## S'mores showdown

Walk up to the fire and click or tap **Roast s'mores**. Everyone else at the fire gets 8 seconds to click or tap **Grab a stick!** (the starter can click **Start now** instead of waiting). After a 3-2-1 countdown, everyone roasts at once for 22 seconds:

- **Press and hold** the **Hold to roast** button to dip your marshmallow into the flames: click and hold with the mouse, press and hold with your finger on a phone, or hold Space. Let go to pull it out.
- Watch the **heat** gauge. Hold too long and it catches fire: click or tap three times (or press Space) to blow it out, then grab a fresh one or serve the charcoal.
- When the fire crackles, a **flare-up** is coming. Pull out fast.
- Click or tap **Serve!** (or press F) when it looks golden brown. Serving early or late both cost points.

Closest to golden wins and gets a 👑 on their name tag until the next round. Friends watching can see everyone's sticks over the fire, and the whole campsite hears who caught fire and who won. Playing alone still works, with a personal best saved on your device.

## The campfire spirit (Ember)

The fire has a spirit, fast asleep in the coals (walk up and you'll see little z's drifting out of it). Anyone at the fire can try to wake it:

1. **Find the sparks.** Click or tap **Wake the fire**. The fire dims and three of its sparks drift off around the campsite (by the tents, the lake, the meadows…). Everyone in the lobby can hunt for them; just walk over a spark to send it home. The **Sparks 1/3** counter in the top left gives hints when you tap it.
2. **Sing the fire's song.** When all three are home, gather at the fire. It sings a short tune: each note flashes a colour through the flames and lights one of five stones (Ember, Sun, Moss, Lake, Moon). Tap the stones in the same order (or press 1 to 5). Anyone at the fire can tap, so you can sing it together. A wrong note makes the fire sputter and sing the verse again. There are four verses, each one note longer.
3. **Ember wakes up.** The fire flares up in every colour, opens its eyes, and says hello.

Then you can talk to it, by typing in its panel, by tapping its mic and speaking (or pressing T), or by starting a normal chat message with "Ember,". Ask it for a story (cozy, spooky, funny, a legend of the campsite, or one starring everyone at the fire) or tap **Ask us a question** for something for the circle to talk about. Ember answers out loud and in captions, and everyone near the fire hears it and sees the words above the flames. The speaker button in its panel mutes Ember's voice just for you; **Hush** stops it talking on your screen. **Let Ember sleep** puts it back to sleep for everyone. Like everything else, Ember falls asleep again when the lobby empties.

### Let Ember really talk (optional)

Out of the box Ember is in **storybook mode**: it tells a set of built-in stories, asks story-circle questions and gives simple answers. To let it hold real conversations, give the server an Anthropic API key:

1. Get a key at [console.anthropic.com](https://console.anthropic.com) (Settings → API keys). Add a little credit to the account.
2. On Render, open the campfire service, go to **Environment**, add `ANTHROPIC_API_KEY` with your key, and save. Render restarts the game in a minute or two.

Ember then talks through Claude Haiku, the fastest and cheapest Claude model, and each answer costs a small fraction of a cent. To keep the bill small no matter who finds your link, the server only answers lobbies that have someone in them, limits how often each lobby and each person can ask, and stops at 400 answers a day (then Ember quietly goes back to its storybook until the next day). Optional settings, also under **Environment**:

| Setting | Default | What it does |
| --- | --- | --- |
| `SPIRIT_DAILY_LIMIT` | `400` | Most answers per day for the whole server. `0` means no limit |
| `SPIRIT_MODEL` | `claude-haiku-5-5` | Which Claude model Ember uses |

The key stays on the server; players' browsers never see it. If Ember still sounds like a storybook after you add the key, look in Render's **Logs** for a line starting with "Ember could not reach Claude": it says what went wrong (for example a mistyped key or no credit). Inside Claude (the artifact version), Ember talks through Claude itself and needs no key.

**Voice:** Ember speaks with your device's built-in speech voice (it picks a low storyteller voice when there is one). Talking to Ember out loud uses the browser's speech recognition: Chrome, Edge and Safari support it; in Firefox, type instead.

## Forest scares

Linger in the deep forest and glowing eyes start watching from the trees. Stay a few more seconds and something jumps out with a scream. It happens at most once every 90 seconds per player, and anyone can switch it off in the **?** panel (Forest scares: Off).

## The old church

Somewhere in the deep woods past the eastern tree line, an abandoned gothic church is hidden in a small clearing. There's no sign and no path: you have to go looking, and the forest devil lives out there too. When you find it, walk up into the door (or tap the church) to go inside.

Inside is a quiet, candlelit ruined cathedral just for the people in there, laid out like a cross: a long nave of pews under great pointed arches, side aisles, a crossing with a marble compass rose, a side chapel and a pipe organ in the transepts, and a raised chancel with tall windows, golden candelabras and a gilded screen behind the altar. Friends inside see and hear each other, and the forest can't reach you. Sit on a pew, read the note in the old hymn book by the altar steps, or try the candle stand in the side chapel on the left. (On slower devices the soft blur at the top and bottom of the screen turns itself off.)

**The pipe organ:** in the right transept. Walk up and press E (or tap it) to sit down and play. Tap, hold or slide across the on-screen keys; on a computer, A S D F G H J K L ; ' are the white notes, W E T Y U O P the black ones, and Z / X change octave (in free play). The organ can teach you a calming song (Amazing Grace, Brahms' Lullaby or Ode to Joy): the next key to press glows, you go at your own pace, and Listen first has the organ play it for you while the keys light up. Press Esc, the arrow keys or Stand up to stop. Friends in the church hear you through its echo, and anyone in the woods near the church hears it faintly, which is a good way to lead them there.

**The candle puzzle:** light all nine candles. Touching a candle also flips the candles right above, below, left and right of it. **Hint** makes one helpful candle glow; **Start over** puts the candles back. Friends in the church share the same candle stand and can solve it together. When the last candle catches, everyone inside gets a **talisman**. Tap **Snuff them and play again** for a new pattern.

**The talisman** turns the forest devil away 3 times: instead of the jump scare, a flash of warm light drives it back. You can see the talisman on your avatar and in the top bar (tap it to see how many wards are left), and it's remembered on your device. Solve the candles again to recharge it.

## Versions

See `CHANGELOG.md`. Every version is saved as a `release-vX.Y` branch, so you can always go back.

## How multiplayer works

Each player sends their position, avatar, last few chat lines, the story-circle state, the church candle stand and the campfire spirit's state to the server. The inside of the church is a separate room placed off the edge of the map, so the server needs nothing special for it. The server forwards changes to everyone else with the same campfire code. Each player's browser decides what to show: chat text only appears for people within earshot. When someone asks Ember something, their browser asks the server (which asks Claude), and passes Ember's words to everyone else as they arrive, so the whole fire hears the same answer.
