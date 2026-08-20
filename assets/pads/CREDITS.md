# Controller pad art credits

The button, d-pad, shoulder, and stick/joystick icons under `assets/pads/`
are vendored from the libretro project's official overlay asset pack:

**https://github.com/libretro/common-overlays**

Licensed under **CC BY 4.0** (https://creativecommons.org/licenses/by/4.0/).

## What was taken from it

- `nes/`, `snes/`, `gameboy/`, `gba/`, `genesis/`, `n64/`, `psx/` —
  full-colour, console-specific icons from `gamepads/<system>/img/`.
- `saturn/`, `neogeo/`, `ngp/`, `pce/`, `wonderswan/`, `vb/`, `a2600/`,
  `lynx/`, `sms/`, `generic/` — neutral outline icons from
  `gamepads/flat/img/`, tinted at runtime by `controller-skins.js` to
  each system's real hardware button colour (the pack ships these
  uncoloured on purpose, for exactly this kind of per-skin tinting).

`sega32x`, `segaCD`, and `ppsspp` reuse the `genesis/` and `psx/` folders
respectively (same real button layout/colours as their sibling systems).
`segaMS`, `wsc`, `coleco`, `msx`, and `intellivision` reuse `sms/`,
`wonderswan/`, and `generic/` the same way — see `controller-skins.js`'s
file header for the full per-system breakdown and disclosed compromises
(SNES A/B colour, Genesis button-index mapping, N64 C-buttons, NDS
glyphs, WonderSwan's second d-pad cluster).

No image in this folder was hand-drawn for ROM Player — every glyph is
sourced from the pack above. Only the surrounding dock plate (the
coloured plastic "shell" the buttons sit on) is original CSS, since the
pack doesn't ship console shell/body art, only button art.
