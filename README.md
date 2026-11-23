# Campfire

A cozy online campsite for a group of friends. Walk around as an avatar, chat with whoever is nearby, fish at the lake, sit by the fire to share stories with prompt cards and a talking stick, see who can roast the best s'more, find the old church hidden in the forest, wake the campfire spirit, a talking fire that tells stories and chats with everyone around it, and sing Amazing Grace to the standing stones to open a door to another world.

Friends join from a link or QR code. No accounts, no app install: it runs in any modern browser on phones and computers.

## What's in this folder

| File | What it does |
| --- | --- |
| `public/index.html` | The whole game (graphics, controls, chat, story cards) |
| `public/spirit-brain.js` | Ember, the campfire spirit: its personality, how it's asked things, and its storybook for when there's no AI |
| `server.js` | Small Node.js server: serves the game, relays players between friends in the same campfire, helps voice connections start, and passes questions for Ember to an AI |
| `ember-brains.js` | Ember's AI brains (Groq, Gemini, Claude) and switching to the next one when one hits its limit |
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
| Sit, stand, fish, go in or out of the church, sing to the stones, step into the door | E or the button above the chat bar | The button above the chat bar |
| Voice | M or the mic button | The mic button, left of the chat bar |
| Start or join a s'mores round | R, or click **Roast s'mores** / **Grab a stick!** | Tap **Roast s'mores** / **Grab a stick!** |
| Roast | Click and hold **Hold to roast** with the mouse, or hold Space | Press and hold **Hold to roast** |
| Serve | Click **Serve!**, or press F | Tap **Serve!** |
| Wake the fire | Walk round the fire 7 times without stopping | Walk round the fire 7 times without stopping |
| Invite the forest devil | Walk up to it at the edge of the clearing and press E (or click it), or say "come and join us" | Walk up to it and tap it or the button, or say "come and join us" |
| Talk to Ember | With your mic on, say "Ember, …"; or start a chat message with "Ember,", press T to speak once, or click a reply along the bottom | With your mic on, say "Ember, …"; or start a chat message with "Ember,", or tap a reply along the bottom |

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

The fire has a spirit, fast asleep in the coals. While it sleeps the fire is just a fire, with no face: little z's drift out of it, and if you stand nearby for a while it mumbles hints in its sleep.

**To wake it, walk round the fire seven times** without stopping. Go either way round, but keep going the same way, stay inside the clearing (not out past the edge of the firelight), and don't stand still. Each lap wakes a spark that circles the flames (friends see them too, along with your trail of embers), and the fire grows a little. There's no lap counter: count the sparks. If you wander off, turn back or stop for too long, the sparks fade and you start again. On the seventh lap the sparks dive into the fire, it flares up in every colour, a ring of light sweeps across the clearing, and Ember opens its eyes and says hello.

Ember only speaks in a speech bubble over the fire (and out loud), so nothing covers it.

**Ember joins the conversation.** It follows what's said around the awake fire, both typed chat and what people with their mic on say out loud, and when the friends pause it decides whether it has something worth adding: a warm or funny reaction, a question about what someone shared, a little tale the topic reminds it of. Most of the time it stays quiet (it answers "PASS" to itself and nobody sees a thing). You don't need to say its name when you're alone at the fire (anything you say goes to Ember), when you're answering a question Ember just asked (the next thing anyone says, within 20 seconds), or when Ember just answered you and you ask it back ("and what about you?"). A question to the circle ("how's everyone doing?") makes Ember think about joining in sooner. One device at the fire does the deciding, and the server allows one try every 10 seconds per lobby, so Ember never answers twice; it waits at least 8 seconds after it last spoke and 15 seconds between tries. Anyone can turn off **Ember joins the conversation** in the **?** panel: then their words only reach Ember when they speak to it, and their device never asks Ember to join in. Spoken words are shared with the other players' games as text (not shown, only for Ember), and only near the awake fire.

**Talking to Ember:**

- **Just talk, with your mic on.** When your voice-chat mic is on and you're near the awake fire, Ember listens too (a little flame shows on the mic button). Anything you say with "Ember" in it goes to Ember; everything else stays between friends. Ember ignores its own voice, and a friend's voice coming out of your speakers isn't sent twice.
  - On computers, the browser's own speech recognition listens.
  - On phones, the browser can't recognise speech while voice chat has the microphone (Android Chrome hears only silence), so the page cuts what you say near the awake fire into short recordings from the voice-chat mic and the server turns them into text with Groq's Whisper (the same free `GROQ_API_KEY`; about 4,000 recordings a day across two models). The server doesn't keep or log them. Without a Groq key, phones type "Ember, …" instead.
- **Or type** a chat message that starts with "Ember," (or press T to say one thing out loud, when your mic is off).
- **Or tap a reply.** Along the bottom of the screen, Ember suggests three things you could say back to whatever it just said. Tap one and you say it out loud at the fire.

A few things work by just asking: "Ember, tell us a story" (say spooky, funny, cozy, a legend, or one about us), "Ember, ask us a question", "Ember, shh" (stops it talking for everyone who hears you) and "Goodnight, Ember" (puts it back to sleep for everyone). To mute Ember's voice just for you, turn off **Ember speaks out loud** in the **?** panel.

**Ember remembers the old story.** Ember knows the world's myth (from *The Seven Things We Must Never Forget*) as its own past: how it was born from the first true story told in the clearing and fell asleep when people stopped sharing, the forest devil as the keeper of forgotten things, the old church and its three windows, the seven stones as the seven things that make us human, and the Otherwhere as the lives we never lived. It tells it in small pieces when the talk touches it, keeps the devil's true identity a mystery, often turns the story back into a question for the friends, and still never gives away how the puzzles are solved. Ask "Ember, where did you come from?" or for a legend. When Ember decides by itself whether to join in, it carries only a short summary of the story, which keeps its requests small enough for the free AI tiers. Storybook mode (no AI) has new legends and replies that match the story too.

Everyone near the fire hears Ember and sees its words. Walk the seven laps again to wake it after Goodnight. Like everything else, Ember falls asleep again when the lobby empties.

### Let Ember really talk (optional, free)

Out of the box Ember is in **storybook mode**: it tells a set of built-in stories, asks story-circle questions and gives simple answers. To let it hold real conversations, give the server one or more AI keys. Two services have free tiers:

1. **Groq** (free, fast, doesn't train on what you send): sign in at [console.groq.com](https://console.groq.com), open **API Keys**, and create a key.
2. **Google Gemini** (free, good storyteller; on the free tier Google may use what's sent to improve its products): sign in at [aistudio.google.com](https://aistudio.google.com), click **Get API key**, and create one.
3. On Render, open the campfire service, go to **Environment**, add `GROQ_API_KEY` and/or `GEMINI_API_KEY` with your keys, and save. Render restarts the game in a minute or two.

**Ember switches brains by itself.** Every model on every service has its own limits, so Ember lines them all up in a chain:

Groq GPT-OSS 120B → Groq GPT-OSS 20B → Groq Qwen 3.8 27B → (Groq Llama 3.3 70B → Llama 3.1 8B, which Groq made Enterprise-only in 2026; they rest a day when refused) → Gemini 3.8 Flash → Gemini 3.5 Flash-Lite → Gemini 3.6 Flash → Gemini 3.1 Flash-Lite

Each question goes to the first brain that isn't resting. When a brain says it's had too many requests, it rests until its limit resets (for Groq usually under a minute; Gemini's daily limits reset at midnight Pacific time, which is 3 or 4 pm in Singapore), and Ember uses the next one. Only when every brain is resting does Ember fall back to its storybook for a little while. To see which brains are ready or resting, open `/spirit-status` on your game's address (for example `https://campfire-74jx.onrender.com/spirit-status`).

You can also add **Claude** with `ANTHROPIC_API_KEY` (from [console.anthropic.com](https://console.anthropic.com); new accounts get a small free credit, then it's paid). Claude goes first in the chain and is capped at 400 answers a day; past that, Ember carries on with the free brains.

| Setting | Default | What it does |
| --- | --- | --- |
| `GROQ_API_KEY` | (none) | Free Groq key |
| `GEMINI_API_KEY` | (none) | Free Gemini key |
| `ANTHROPIC_API_KEY` | (none) | Claude key (paid after the starter credit) |
| `SPIRIT_ORDER` | `anthropic,groq,gemini` | Which services to try first |
| `GROQ_MODELS` | `openai/gpt-oss-120b,openai/gpt-oss-20b,qwen/qwen3.8-27b,llama-3.3-70b-versatile,llama-3.1-8b-instant` | Groq models to use, in order |
| `GROQ_EAR_MODELS` | `whisper-large-v3-turbo,whisper-large-v3` | Groq speech-to-text models for Ember's ears on phones |
| `GEMINI_MODELS` | `gemini-3.8-flash,gemini-3.5-flash-lite,gemini-3.6-flash,gemini-3.1-flash-lite` | Gemini models to use, in order |
| `SPIRIT_MODEL` | `claude-haiku-5-5` | Which Claude model to use |
| `SPIRIT_DAILY_LIMIT` | `400` | Most Claude answers per day. `0` means no limit. Free brains aren't counted |

The keys stay on the server; players' browsers never see them. To stop strangers who find your link from using up the limits, the server only answers lobbies that have someone in them and limits how often each lobby and each person can ask. Render's **Logs** show a line whenever Ember switches brains and why (for example "Ember: Groq llama-3.3-70b-versatile too many requests; resting 12s, switching to Groq openai/gpt-oss-120b"), and a line if a key is wrong or a model has been retired. Inside Claude (the artifact version), Ember talks through Claude itself and needs no key.

**Ember's voice:** a natural voice from the server, made to sound like a fire spirit in the page: warmed, with a ghostly double a breath behind it (wavering like heat over the flames), an echo as if it spoke from somewhere much bigger than the fire, and crackles while it talks. Its mouth and flames move with its voice. Everyone at the fire asks for the same lines, so each line is made once, and the server starts on the first sentences while the answer is still being written. The server tries these in order:

| Voice | Key on Render | Free? | Default voice |
| --- | --- | --- | --- |
| Deepgram Aura-2 (best) | `DEEPGRAM_API_KEY` from [console.deepgram.com](https://console.deepgram.com) | $200 credit at sign-up, no card, doesn't expire (millions of characters) | `DEEPGRAM_VOICE=aura-2-draco-en` (warm British baritone, a storyteller). Others: `aura-2-zeus-en` (deep), `aura-2-pluto-en`, `aura-2-orion-en`, `aura-2-pandora-en` (breathy, female) |
| Groq Orpheus | your `GROQ_API_KEY` | Yes, but only about 100 lines a day | `GROQ_VOICE=troy` (also austin, daniel, autumn, diana, hannah; `off` to skip). Groq may ask you to accept the model's terms once: open `canopylabs/orpheus-v1-english` in the [Groq playground](https://console.groq.com/playground) |
| The device's own voice | none | Yes | the most natural voice on the device |

`EMBER_VOICE_DAILY_CHARS` (default 100,000) caps how much Ember says a day through the server, so the credit lasts. `/spirit-status` shows which voices are resting and why. Talking to Ember out loud uses the browser's speech recognition: Chrome, Edge and Safari support it; in Firefox, type instead. On a few phones the speech recognition can't share the microphone with voice chat; there, Ember stops listening (so friends can still hear you) and says to type instead.

## The singing stones

Seven old standing stones stand in a ring in a glade in the **south-west (bottom-left) corner of the woods**. Follow the faint trail that leaves the south path. Each stone sings a note, and together they know one hymn.

Sing them **the first line of Amazing Grace** ("A-ma-zing grace, how sweet the sound") and a door opens in the middle of the ring. There are two ways:

- **Sing it:** turn your mic on (the voice-chat mic), step inside the ring and sing. There's no button: the stones simply listen while your mic is on and you're inside the ring, in any key and at your own speed. It doesn't have to be exact: the stones listen for the shape of the tune, so sliding between notes, a slightly flat note or your own little turns are fine, while other songs and ordinary talking won't open it. A soft ring on the ground brightens with your voice, the stones light up one after another round the ring as you get through the line (all seven are glowing by the time it's sung), and little notes rise over your head. They never ask for the mic themselves, and what they hear stays on your device. With your mic off, they don't listen.
- **Play it:** tap the stones in order (or press 1 to 7 on a keyboard). It's the same tune the church organ teaches.

**The stones' questions:** each stone is named for one of the seven things that make us human (Memory, Laughter, Courage, Longing, Wonder, Truth, Kinship) and keeps a question. Tap or click a stone (from outside the glade you walk over first), or stand right beside one and choose **Touch the … stone** (or press E): it hums its note and its question appears on a card for everyone in the glade, for example the Memory stone's carved question, "What is a childhood memory you wish you could relive?". Touch it again for the next of its three questions. Touching a stone doesn't count towards the song. Stones you've heard (touched yourself, or were in the glade when a friend touched them) are remembered on your device, and their questions become a deck called **The Stones** in the story circle at the fire.

When the line is sung, every stone beams into the middle, a pillar of light goes up, and a **door** opens for about a minute. Anyone can walk into it, tap it, or press E (**Step into the door**). After it closes, the stones rest for 20 seconds before they'll listen again. Friends hear your stone notes, watch the stones light up, and get a message when the door opens.

**The Otherwhere** is a little island floating under strange stars and aurora. Its fire burns downward. Friends who come through see and hear each other, and a shared story card asks for stories from the life you didn't live ("In another life, you said yes to the thing you turned down. How is that life going?"). Tap **Turn another card** for a new one. The orange **Home** rift at the top of the island always takes you back to the stone circle, even after the door has closed.

The windows above the altar in the old church tell the story (see below), and the forest devil won't set foot in the glade.

## Forest scares

Linger in the deep forest and glowing eyes start watching from the trees. Stay a few more seconds and something jumps out with a scream. It happens at most once every 90 seconds per player, and anyone can switch it off in the **?** panel (Forest scares: Off).

## The forest devil comes to the fire

The devil of the deep woods was never evil. It keeps the stories people forgot, and once Ember is awake it starts to listen to the friends at the fire. The deeper the talk, the closer it comes:

1. **Listening from afar.** A minute or two after friends start talking at the awake fire, a pair of eyes appears far off in the trees to the south-east, and the log says something has stopped to listen.
2. **Closer.** A tall antlered shape half hidden behind a tree.
3. **At the edge of the clearing.** It stands at the edge of the firelight, listening. Ember notices ("Someone has come to the edge of my clearing…") and, if nobody asks it over, hints that someone would have to. Nothing jumps out of the woods while it's there. On a phone it may be off screen: two small eyes at the edge of the screen show where it is.
4. **Invite it.** Walk up to it (your heart pounds, the dark closes in, then it lowers its head and waits) and choose **Invite it to the fire** (E, or tap it). Or ask it from the fire, typed or out loud: "come and join us", "devil, come sit with us".
5. **Its story.** It walks round the logs, sits in the gap on the west side of the fire and tells the story it has carried all these years, one chapter at a time: *The first fire*, *The first friend*, *How the world was told*, *How I became the forest devil*. Each chapter ends with a question for the friends. It goes on once a few of them have answered and the talk pauses (or when someone taps **What happened next?**, or says "tell us more"). After the last question (who do you wish you'd spent more time with?) it says goodbye, walks back into the woods with gold eyes and leaves on its antlers, and leaves its ember in the fire.

**What it listens to:** how much is shared, not who says what. Lines said at the awake fire count (typed, or heard by Ember with the mic on), and more for long, personal ones (memories, family, feelings); so do friends talking out loud, story cards drawn and the talking stick passed on. Only words from people who have **Ember joins the conversation** on are counted. Now and then it laughs at a joke ("haha", 😂) with a rusty chuckle, or cries at a sad story (a sigh, a glowing tear). The reactions picker has a new 😢.

**It remembers.** Chapters you've heard are saved on your device. Next time, it comes to listen sooner and picks up where your group left off. Friends who've heard all of it find it only comes to listen, says goodbye and goes. After it goes home, the woods are gentle for everyone who heard it: its eyes are gold, and instead of jumping out it peeks from behind a tree, nods and slips away. A small gold spark circles Ember's flames.

Its voice is Ember's server voice, slowed and deepened with the dark of the woods (or the device's own voice, pitched low), and it follows **Ember speaks out loud**. With an AI brain, Ember knows where the devil is and plays host. One device at the fire (the lowest id) does the listening and decides when the devil moves on, so it's the same for everyone; anyone can invite it or ask it to go on.

## The old church

Somewhere in the deep woods past the eastern tree line, an abandoned gothic church is hidden in a small clearing. There's no sign and no path: you have to go looking, and the forest devil lives out there too. When you find it, walk up into the door (or tap the church) to go inside.

Inside is a quiet, candlelit ruined cathedral just for the people in there, laid out like a cross: a long nave of pews under great pointed arches, side aisles, a crossing with a marble compass rose, a side chapel and a pipe organ in the transepts, and a raised chancel with tall windows, golden candelabras and a gilded screen behind the altar. Friends inside see and hear each other, and the forest can't reach you. Sit on a pew, read the note in the old hymn book by the altar steps, or try the candle stand in the side chapel on the left. (On slower devices the soft blur at the top and bottom of the screen turns itself off.)

**The pipe organ:** in the right transept. Walk up and press E (or tap it) to sit down and play. Tap, hold or slide across the on-screen keys; on a computer, A S D F G H J K L ; ' are the white notes, W E T Y U O P the black ones, and Z / X change octave (on the book's first page). An old music book lies open on the organ's stand, at whatever page it was last left on. Its first page is free play; turn the page (the arrows, a swipe, or [ and ]) to find a calming song (Amazing Grace, Brahms' Lullaby or Ode to Joy). Light wakes along the keys and settles on the first note, the next key keeps glowing as you go at your own pace, and the notes on the page darken as you play. Hear it first has the organ play the song for you while the page follows along. Friends see the book on the organ turn its pages. Press Esc, the arrow keys or Stand up to stop. Friends in the church hear you through its echo, and anyone in the woods near the church hears it faintly, which is a good way to lead them there.

**The windows above the altar:** three tall stained-glass windows behind the altar keep the campsite's secrets (Ember, the singing stones and the forest devil), but until they wake you can only just make out pictures in the glass (the old hymn book has a hint). Play Amazing Grace on the organ and, as the last chord rings, the view drifts up to the altar: the seven niches in the gilded screen sing the line back in the stones' voices and colours, the windows fill with light, and coloured light falls across the floor. Friends in the church see it too. Then walk up to the altar (or tap the windows) and choose **Look at the windows** for a full-screen view of all three: *The Sleeping Fire*, *The Singing Stones* and *The Devil of the Deep Wood*. Each has a short riddle instead of instructions, so working out what they mean is part of the hunt. The Singing Stones window has ♪ Listen to the glass, which hums a tune on the stones' voices and lights its notes over the door, each in a stone's colour. Swipe, use the arrows or tap a window to look from one to the next; Esc or × goes back. Windows you've seen stay lit on your device, and they're lit for anyone in the church with someone who has seen them.

**The candle puzzle:** light all nine candles. Touching a candle also flips the candles right above, below, left and right of it. **Hint** makes one helpful candle glow; **Start over** puts the candles back. Friends in the church share the same candle stand and can solve it together. When the last candle catches, everyone inside gets a **talisman**. Tap **Snuff them and play again** for a new pattern.

**The talisman** turns the forest devil away 3 times: instead of the jump scare, a flash of warm light drives it back. You can see the talisman on your avatar and in the top bar (tap it to see how many wards are left), and it's remembered on your device. Solve the candles again to recharge it.

## Versions

See `CHANGELOG.md`. Every version is saved as a `release-vX.Y` branch, so you can always go back.

## How multiplayer works

Each player sends their position, avatar, last few chat lines, the story-circle state, the church candle stand, whether they've seen the windows above the altar wake, and the campfire spirit's state to the server. The inside of the church and the Otherwhere are separate rooms placed off the edges of the map, so the server needs nothing special for them. Stone notes and how far through the tune each player is travel in presence; the door in the stone circle, the Otherwhere story card and the stones' question card travel the same way as the story circle: every player carries the newest version they know. Singing is heard on your own device only. The server forwards changes to everyone else with the same campfire code. Each player's browser decides what to show: chat text only appears for people within earshot. When someone asks Ember something, their browser asks the server (which asks Claude), and passes Ember's words to everyone else as they arrive, so the whole fire hears the same answer.
