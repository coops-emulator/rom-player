# 🎮 ROM Player by Coops

A browser-based retro gaming PWA. Drop in a ROM, hit play — no installs, no extensions required.

🔗 **[romplayerbycoops.pages.dev](https://romplayerbycoops.pages.dev)**

---

## Supported Systems

| System | Notes |
|---|---|
| Nintendo NES | |
| Nintendo SNES | |
| Nintendo 64 | |
| Game Boy | |
| Game Boy Color | Color correction supported |
| Game Boy Advance | Color correction supported |
| Nintendo DS | BIOS optional |
| Virtual Boy | |
| PlayStation 1 | BIOS required |
| PlayStation Portable | BIOS optional |
| Sega Master System | |
| Sega Genesis / Mega Drive | |
| Sega CD | BIOS required |
| Sega Saturn | BIOS required |
| Sega 32X | |
| Sega Game Gear | |
| Neo Geo | |
| Neo Geo Pocket | |
| PC Engine / TurboGrafx-16 | |
| WonderSwan / WonderSwan Color | |
| Atari 2600 | |
| Atari Lynx | |
| ColecoVision | |
| Intellivision | |
| Vectrex | |
| MSX | |

---

## Features

**Core**
- Drag-and-drop or tap-to-browse ROM loading, right from the home screen
- Save states — save and load anytime
- Rewind — per-core tuned (PS1: 512MB buffer, GBA/SNES: 256MB)
- Cover art — auto-fetched via IGDB, proxied and edge-cached through a Cloudflare Worker
- Fullscreen — native + pseudo-fullscreen with iPhone notch support
- Gamepad support — plug in a controller and go
- Keyboard shortcuts — press `?` in-app for the cheat sheet
- Offline play — full PWA with service worker caching
- First-run walkthrough and a "what's new" prompt after updates

**Library**
- ROM library with metadata stored in IndexedDB
- ROM binaries stored in OPFS for fast local access
- Playtime tracking and game history
- "Jump back in" hero banner + recently played strip on the home screen
- Duplicate detection — flags a likely-same game already in your library
  (by cleaned name + system) and asks before replacing it, so nothing is
  ever overwritten silently

**BIOS Management**
- Upload and store BIOS files locally (OPFS)
- Required: PS1, Sega CD, Saturn
- Optional: NDS, PSP

**Themes**
- Free: Deep Space (default), NES, SNES, Game Boy, N64, Genesis, GBA, PS1
- Premium: DOOM, Dreamcast, Cyber Neon, Virtual Boy, GBA SP Cobalt, Sega Saturn, Neo Geo MVS, Famicom Disk
- Custom theme builder — pick your own background + accent colour

**Linkup Room (ROM Exchange)**
- P2P ROM sharing between users via PeerJS — no server, direct peer-to-peer
- Premium hosts can set a room password to keep their room invite-only

---

## Free vs Premium

| Feature | Free | Premium |
|---|---|---|
| Play ROMs | ✅ | ✅ |
| Save states | 3 slots | 10 slots + screenshot thumbnails |
| Rewind | ✅ | ✅ |
| Cover art | ✅ | ✅ |
| Themes | 8 | 8 free + 8 exclusive |
| Linkup Room / ROM Exchange | ✅ | ✅, + room passwords |
| Play stats dashboard | ❌ | ✅ |
| Cloud save sync | ❌ | ✅ |
| Library sync across devices | ❌ | ✅ |
| Cloud ROM storage (Dropbox) | ❌ | ✅ |

Premium is **$3 AUD/month** via Stripe — or unlocked permanently with a one-time, single-use redeem code.

---

## Tech Stack

- **EmulatorJS** (libretro cores) — local `./data/` with CDN fallback
- **PeerJS** — P2P ROM Exchange / Linkup Room
- **Supabase** — auth, user profiles, premium status, redeem codes
- **Stripe** — premium subscription billing, synced to Supabase via webhook
- **Cloudflare Pages + `_worker.js`** — hosting, edge routing, Dropbox OAuth proxy, redeem-code handling, and an IGDB cover-art proxy (edge-cached 30 days)
- **Dropbox API** — optional cloud ROM storage + save upload for premium users
- **IndexedDB + OPFS** — local ROM and save state storage
- **Service Worker** — offline support + PWA caching

---

## Deployment

```bash
# Stamp a new version and deploy
sh deploy.sh
```

Version timestamps are generated at deploy time (`YYYYMMDDHHMMSS` UTC) and written simultaneously to `index.html`, `sw.js`, and `version.json`. Never reuse an old timestamp — it will cause cache/update bugs.

---

## Notes

- By default, ROM files are never uploaded anywhere — everything stays on your device. Premium users may opt in to Dropbox for cloud ROM storage; nothing is sent off-device otherwise
- BIOS files are stored locally in OPFS, never transmitted
- Premium validation is handled server-side via Cloudflare Workers + Supabase

---

## Legal

ROM Player by Coops is an independent emulator project. It is not affiliated with, authorized, endorsed, or sponsored by Nintendo, Sony, Sega, SNK, Atari, NEC, Bandai, or any other hardware manufacturer or rights holder. All trademarks, system names, and brand names are the property of their respective owners.

ROM Player does not distribute, host, or facilitate the downloading of copyrighted ROM or BIOS files. Users are solely responsible for ensuring they have the legal right to use any software they load into the emulator.

This project is licensed under the [GNU General Public License v3.0](LICENSE).

---

*Built by [Coops](https://github.com/coops-emulator)*
