# Campfire versions

Each version is saved on GitHub as its own branch (`release-v0.1`, `release-v0.2`, …), so any of them can be put back live. The version number also shows at the bottom of the **?** panel in the game.

| Version | Branch | What changed |
| --- | --- | --- |
| v0.5 | `release-v0.5` | Lobbies: the join screen has a Lobby name box. Type any name (friends who type the same name meet at the same fire), or tap the dice for a made-up one. Invite links fill in the lobby for friends, and you see how many people are already there before joining. Your last lobby is remembered on your device. |
| v0.4.1 | `release-v0.4.1` | S'mores instructions: the help panel and README now say you can click and hold **Hold to roast** with the mouse (not just Space), and click **Roast s'mores** / **Serve!**. A short how-to line shows in the s'mores panel until you first roast. The help panel now scrolls on small phones instead of getting cut off. |
| v0.4 | `release-v0.4` | S'mores showdown: anyone at the fire can start a round, friends grab a stick, and everyone roasts at once. Hold to dip the marshmallow into the flames, watch the heat, dodge flare-ups, and serve when it looks golden. Closest to golden wins a crown. Works solo too, with a personal best. S'mores sounds follow the campsite volume slider. |
| v0.3.4 | `release-v0.3.4` | Campsite sound volume: the speaker button in the top bar opens a slider (with mute) for the fire, chimes and forest scares. Friends' voices aren't affected. Your level is remembered on your device; the fire now starts at 50% when you join instead of being off. |
| v0.3.2 | `release-v0.3.2` | Wave, laugh and heart now sit behind one smiley button: tap it to open a small picker, tap one to send it. Gives the chat box more room on phones. |
| v0.3.1 | `release-v0.3.1` | Chat box grows upward as you type (like WhatsApp), up to 5 lines, then scrolls. Shrinks back after you send. |
| v0.3 | `release-v0.3` | Forest scares: linger in the deep forest and glowing eyes appear in the trees, then a creature jumps out with a scream. Friends hear about it in their chat log. Can be turned off in the **?** panel. |
| v0.2 | `release-v0.2` | Proximity voice chat with a mic button; volume fades with distance; everyone at the fire hears each other. |
| v0.1 | `release-v0.1` | First online version: campsite, avatars, room links and QR invites, nearby text chat, story circle with cards and talking stick, fishing. |

## Going back to an earlier version

Ask Claude "put v0.2 back live" (or any version). It copies that version onto `main`, and Render redeploys it in 2–3 minutes. Nothing is deleted: the newer versions stay saved on their branches.
