# Campfire versions

Each version is saved on GitHub as its own branch (`release-v0.1`, `release-v0.2`, …), so any of them can be put back live. The version number also shows at the bottom of the **?** panel in the game.

| Version | Branch | What changed |
| --- | --- | --- |
| v0.3 | `release-v0.3` | Forest scares: linger in the deep forest and glowing eyes appear in the trees, then a creature jumps out with a scream. Friends hear about it in their chat log. Can be turned off in the **?** panel. |
| v0.2 | `release-v0.2` | Proximity voice chat with a mic button; volume fades with distance; everyone at the fire hears each other. |
| v0.1 | `release-v0.1` | First online version: campsite, avatars, room links and QR invites, nearby text chat, story circle with cards and talking stick, fishing. |

## Going back to an earlier version

Ask Claude "put v0.2 back live" (or any version). It copies that version onto `main`, and Render redeploys it in 2–3 minutes. Nothing is deleted: the newer versions stay saved on their branches.
