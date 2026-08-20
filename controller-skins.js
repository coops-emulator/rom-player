/**
 * controller-skins.js
 * ═══════════════════════════════════════════════════════════════════════
 * ROM Player by Coops — custom on-screen controller skins.
 *
 * v3: real artwork, not hand-drawn shapes. Every button/d-pad/shoulder
 * glyph rendered by this module is a vendored PNG from the libretro
 * project's own official overlay asset pack:
 *
 *   https://github.com/libretro/common-overlays  (CC BY 4.0 — see
 *   assets/pads/CREDITS.md for the exact attribution and file list)
 *
 * Nothing in this file draws a button/d-pad shape with CSS gradients.
 * Two tiers of art are used:
 *
 *  TIER 1 — full-colour, console-specific icons, used exactly as
 *  shipped (nes, snes, gameboy [covers GB/GBC], gba, genesis [also
 *  covers 32X/Sega CD], n64, psx [also covers PSP]). These already
 *  look like real molded buttons out of the box — no extra tinting.
 *
 *  TIER 2 — the pack's neutral outline icon set ("flat"), which ships
 *  with its own real per-system button assignments (verified against
 *  the pack's own .cfg files — see file-by-file notes in the LAYOUTS
 *  table below) but no baked-in colour. This module draws a small CSS
 *  colour chip *behind* each one, matching that console's real button
 *  colour — the same two-layer construction (coloured disc + glyph)
 *  the TIER 1 art itself uses, just not baked into one file. Covers:
 *  saturn, neogeo, ngp, pce, wonderswan/wonderswan color, vb, a2600,
 *  lynx, sms (also covers segaGG). nds/coleco/msx/intellivision have
 *  no dedicated art anywhere in the pack, so they use its generic
 *  A/B/C/D/L/R glyph set (see the "generic" folder + note below).
 *
 * The dock plate/shell itself (the coloured plastic body the buttons
 * sit on) has no equivalent in the asset pack — nobody ships console
 * *shell* art, only button art — so that part is still a CSS gradient
 * built from each system's real body colour. That's the one visual
 * element here that isn't a vendored image, because nothing to vendor
 * exists.
 *
 * Input is driven straight through EmulatorJS's documented low-level
 * API: window.EJS_emulator.gameManager.simulateInput(player, index, value)
 * — see https://emulatorjs.org/docs4devs/control-mapping/ for the index
 * table IDX below is built from.
 *
 * VISIBILITY: dock is appended as a sibling flex-child of the game
 * screen area inside #game-stage (see index.html's #game-screen-area
 * wrapper) — never anywhere else in the app. attach()/detach() are only
 * ever called from the game-start / game-exit lifecycle in index.html,
 * so the dock only exists in the DOM while a game is actually running.
 * attach() itself still hard-gates on isTouchDevice() and the "Custom
 * on-screen controller skin" setting, so desktop/mouse devices never
 * build anything. Colours/art swap automatically per system — attach()
 * is called fresh with the new core id every time a game (re)starts.
 *
 * KNOWN COMPROMISES (disclosed, not hidden):
 *  - SNES: the pack's own A/B icons are coloured red/yellow — swapped
 *    from real SNES A(yellow)/B(red). X(blue)/Y(green) are correct.
 *    This is the pack's own convention (RetroArch ships it this way
 *    too), not something introduced here — flagging it rather than
 *    silently shipping it.
 *  - Genesis A/B/C RetroPad index mapping is still a best guess
 *    (B=A, A=B, X=C) pending a real-hardware test — same caveat as v2.
 *  - N64 C-buttons: still not wired — no confirmed simulateInput index
 *    for them. Real C-button icons ARE vendored and ready to drop in
 *    the moment that's confirmed (see n64 folder).
 *  - WonderSwan has two physical d-pad clusters (X and Y) in real life;
 *    only the X cluster is wired as the movement pad here to keep the
 *    dock legible at this size.
 *  - NDS: the pack has no dedicated NDS art. A/B use the generic A/B
 *    glyphs; X/Y borrow the generic C/D glyphs (so the glyph will read
 *    "C"/"D" rather than "X"/"Y" — cosmetic only, the actual input is
 *    still wired to real X/Y).
 *  - ColecoVision/MSX/Intellivision: no dedicated art exists anywhere
 *    in the pack for these three, so they use the same generic A/B/L/R
 *    glyph set as NDS, tinted to each system's real body colour.
 * ═══════════════════════════════════════════════════════════════════════
 */
(function (global) {
  "use strict";

  const ASSET_BASE = 'assets/pads/';
  function img(path) { return ASSET_BASE + path; }

  // ── Generic RetroPad slot indices ─────────────────────────────────────
  const IDX = {
    UP: 4, DOWN: 5, LEFT: 6, RIGHT: 7,
    SELECT: 2, START: 3,
    A: 0, B: 8, X: 1, Y: 9,
    L: 10, R: 11, L2: 12, R2: 13,
    STICK_R: 16, STICK_L: 17, STICK_D: 18, STICK_U: 19,
  };

  // ── Fixed dock geometry (shared by every system) ──────────────────────
  const DPAD_ANCHOR            = { x: 19, y: 54 };
  const DPAD_ANCHOR_WITH_STICK = { x: 13, y: 68 };
  const STICK_ANCHOR           = { x: 34, y: 38 };
  const FACE_ANCHOR            = { x: 78, y: 50 };
  const SHOULDER_Y             = 8;
  const SHOULDER_Y_ROW2        = 21;
  const CENTER_Y                = 91;

  // ── Per-console layouts ────────────────────────────────────────────────
  // buttons[].icon: path under assets/pads/. buttons[].tint: only set for
  // TIER-2 (neutral outline) icons — draws a colour chip behind them.
  // TIER-1 icons are already full colour and never carry a tint.
  const LAYOUTS = {
    // ── Nintendo (TIER 1) ─────────────────────────────────────────────
    nes: {
      label: 'NES', bodyColor: '#cfcfcf', bodyColor2: '#a6a6a6',
      dpad: { icon: img('nes/dpad.png') },
      buttons: [
        { id: 'b', idx: IDX.B, dx: -36, dy: 10, icon: img('nes/b.png') },
        { id: 'a', idx: IDX.A, dx: 6, dy: -10, icon: img('nes/a.png') },
      ],
      center: [
        { id: 'select', idx: IDX.SELECT, icon: img('nes/select.png') },
        { id: 'start', idx: IDX.START, icon: img('nes/start.png') },
      ],
    },
    snes: {
      label: 'SUPER NINTENDO', bodyColor: '#e2e2e8', bodyColor2: '#b9b9c4',
      dpad: { icon: img('snes/dpad.png') },
      // Position-correct (a=east, b=south, x=north, y=west). Colour note:
      // see file header — a/b colours are the pack's own, not swapped by us.
      buttons: [
        { id: 'y', idx: IDX.Y, dx: -32, dy: 0, icon: img('snes/y.png') },
        { id: 'x', idx: IDX.X, dx: 0, dy: -24, icon: img('snes/x.png') },
        { id: 'b', idx: IDX.B, dx: 0, dy: 24, icon: img('snes/b.png') },
        { id: 'a', idx: IDX.A, dx: 32, dy: 0, icon: img('snes/a.png') },
      ],
      shoulders: [
        { id: 'l', idx: IDX.L, icon: img('snes/l1.png') },
        { id: 'r', idx: IDX.R, icon: img('snes/r1.png') },
      ],
      center: [
        { id: 'select', idx: IDX.SELECT, icon: img('snes/select.png') },
        { id: 'start', idx: IDX.START, icon: img('snes/start.png') },
      ],
    },
    gambatte: { // GB / GBC
      label: 'GAME BOY', bodyColor: '#a6b596', bodyColor2: '#83937a',
      dpad: { icon: img('gameboy/dpad.png') },
      buttons: [
        { id: 'b', idx: IDX.B, dx: -30, dy: 12, icon: img('gameboy/b.png') },
        { id: 'a', idx: IDX.A, dx: 6, dy: -8, icon: img('gameboy/a.png') },
      ],
      center: [
        { id: 'select', idx: IDX.SELECT, icon: img('gameboy/select.png') },
        { id: 'start', idx: IDX.START, icon: img('gameboy/start.png') },
      ],
    },
    gba: {
      label: 'GAME BOY ADVANCE', bodyColor: '#5f43a8', bodyColor2: '#402c7f',
      dpad: { icon: img('gba/dpad.png') },
      buttons: [
        { id: 'b', idx: IDX.B, dx: -28, dy: 12, icon: img('gba/b.png') },
        { id: 'a', idx: IDX.A, dx: 2, dy: -6, icon: img('gba/a.png') },
      ],
      shoulders: [
        { id: 'l', idx: IDX.L, icon: img('gba/l.png') },
        { id: 'r', idx: IDX.R, icon: img('gba/r.png') },
      ],
      center: [
        { id: 'select', idx: IDX.SELECT, icon: img('gba/select.png') },
        { id: 'start', idx: IDX.START, icon: img('gba/start.png') },
      ],
    },
    n64: {
      label: 'NINTENDO 64', bodyColor: '#43434f', bodyColor2: '#28282f',
      dpad: {
        anchor: DPAD_ANCHOR_WITH_STICK, size: 84,
        up: img('n64/dpad-up.png'), down: img('n64/dpad-down.png'),
        left: img('n64/dpad-left.png'), right: img('n64/dpad-right.png'),
      },
      stick: { size: 104, bg: img('n64/thumbstick-background.png'), nub: img('n64/thumbstick-pad_arcade.png') },
      buttons: [
        { id: 'b', idx: IDX.B, dx: -30, dy: 10, icon: img('n64/B.png') },
        { id: 'a', idx: IDX.A, dx: 8, dy: -8, size: 58, icon: img('n64/A.png') },
      ],
      shoulders: [
        { id: 'l', idx: IDX.L, icon: img('n64/L.png') },
        { id: 'r', idx: IDX.R, icon: img('n64/R.png') },
      ],
      center: [{ id: 'start', idx: IDX.START, icon: img('n64/start_rounded_big.png') }],
    },

    // ── Sega (TIER 1: segaMD/32x/segaCD share genesis art) ─────────────
    segaMD: {
      label: 'GENESIS', bodyColor: '#232323', bodyColor2: '#121212',
      dpad: { icon: img('genesis/dpad.png') },
      buttons: [
        { id: 'a', idx: IDX.B, dx: -36, dy: 10, icon: img('genesis/a.png') },
        { id: 'b', idx: IDX.A, dx: 0, dy: -14, icon: img('genesis/b.png') },
        { id: 'c', idx: IDX.X, dx: 36, dy: 10, icon: img('genesis/c.png') },
      ],
      center: [{ id: 'start', idx: IDX.START, icon: img('genesis/start.png') }],
    },
    sega32x: null, segaCD: null, // aliased below

    // ── Sega (TIER 2: flat pack, real per-system mapping) ─────────────
    saturn: {
      label: 'SATURN', bodyColor: '#4d4d4d', bodyColor2: '#2c2c2c',
      dpad: {
        up: img('saturn/dpad-up.png'), down: img('saturn/dpad-down.png'),
        left: img('saturn/dpad-left.png'), right: img('saturn/dpad-right.png'), tint: '#1c1c1c',
      },
      buttons: [
        { id: 'x', idx: IDX.X, dx: 0, dy: -22, icon: img('saturn/X.png'), tint: '#3f7fce' },
        { id: 'y', idx: IDX.Y, dx: -30, dy: -10, icon: img('saturn/Y.png'), tint: '#3f9e5c' },
        { id: 'z', idx: IDX.R2, dx: 30, dy: -10, icon: img('saturn/Z.png'), tint: '#7a5fc9' },
        { id: 'b', idx: IDX.B, dx: -30, dy: 16, icon: img('saturn/B.png'), tint: '#d94a76' },
        { id: 'a', idx: IDX.A, dx: 0, dy: 26, icon: img('saturn/A.png'), tint: '#d9a53f' },
        { id: 'c', idx: IDX.L2, dx: 30, dy: 16, icon: img('saturn/C.png'), tint: '#3fa5a0' },
      ],
      shoulders: [
        { id: 'l', idx: IDX.L, icon: img('saturn/L_down.png'), tint: '#1c1c1c' },
        { id: 'r', idx: IDX.R, icon: img('saturn/R_down.png'), tint: '#1c1c1c' },
      ],
      center: [{ id: 'start', idx: IDX.START, icon: img('saturn/start_genesis.png'), tint: '#1c1c1c' }],
    },
    neogeo: {
      label: 'NEO GEO', bodyColor: '#4d4d4d', bodyColor2: '#2c2c2c',
      dpad: {
        up: img('neogeo/dpad-up.png'), down: img('neogeo/dpad-down.png'),
        left: img('neogeo/dpad-left.png'), right: img('neogeo/dpad-right.png'), tint: '#1c1c1c',
      },
      buttons: [
        { id: 'a', idx: IDX.B, dx: -34, dy: 10, icon: img('neogeo/A.png'), tint: '#c0392b' },
        { id: 'b', idx: IDX.A, dx: 6, dy: -10, icon: img('neogeo/B.png'), tint: '#c0392b' },
        { id: 'c', idx: IDX.X, dx: -34, dy: 34, icon: img('neogeo/C.png'), tint: '#c0392b' },
        { id: 'd', idx: IDX.Y, dx: 6, dy: 14, icon: img('neogeo/D.png'), tint: '#c0392b' },
      ],
      center: [{ id: 'start', idx: IDX.START, icon: img('neogeo/start_rounded.png'), tint: '#1c1c1c' }],
    },
    segaGG: {
      label: 'GAME GEAR', bodyColor: '#161616', bodyColor2: '#050505',
      dpad: {
        up: img('sms/dpad-up.png'), down: img('sms/dpad-down.png'),
        left: img('sms/dpad-left.png'), right: img('sms/dpad-right.png'), tint: '#2f2f2f',
      },
      buttons: [
        { id: '1', idx: IDX.B, dx: -20, dy: 10, icon: img('sms/1.png'), tint: '#c0392b' },
        { id: '2', idx: IDX.A, dx: 12, dy: -8, icon: img('sms/2.png'), tint: '#2d6fc4' },
      ],
      center: [{ id: 'start', idx: IDX.START, icon: img('sms/pause_square_text.png'), tint: '#1c1c1c' }],
    },
    segaMS: null, // aliased to segaGG below

    // ── Sony (TIER 1: psx art also used for ppsspp) ────────────────────
    psx: {
      label: 'PLAYSTATION', bodyColor: '#cdcdc7', bodyColor2: '#a5a59e',
      dpad: { icon: img('psx/dpad.png') },
      // Real symbol art — icon carries the shape, no text label needed.
      buttons: [
        { id: 'tri', idx: IDX.X, dx: 0, dy: -26, icon: img('psx/x.png') },
        { id: 'sq', idx: IDX.Y, dx: -26, dy: 0, icon: img('psx/y.png') },
        { id: 'cir', idx: IDX.A, dx: 26, dy: 0, icon: img('psx/a.png') },
        { id: 'cro', idx: IDX.B, dx: 0, dy: 26, icon: img('psx/b.png') },
      ],
      shoulders: [
        { id: 'l1', idx: IDX.L, icon: img('psx/l1.png') },
        { id: 'r1', idx: IDX.R, icon: img('psx/r1.png') },
        { id: 'l2', idx: IDX.L2, row: 2, icon: img('psx/l2.png') },
        { id: 'r2', idx: IDX.R2, row: 2, icon: img('psx/r2.png') },
      ],
      center: [
        { id: 'select', idx: IDX.SELECT, icon: img('psx/select.png') },
        { id: 'start', idx: IDX.START, icon: img('psx/start.png') },
      ],
    },

    // ── Others (TIER 2 unless noted) ──────────────────────────────────
    pce: {
      label: 'PC ENGINE', bodyColor: '#eee7da', bodyColor2: '#cac2b0',
      dpad: {
        up: img('pce/dpad-up.png'), down: img('pce/dpad-down.png'),
        left: img('pce/dpad-left.png'), right: img('pce/dpad-right.png'), tint: '#3a3a3a',
      },
      buttons: [
        { id: 'ii', idx: IDX.B, dx: -22, dy: 10, icon: img('pce/II.png'), tint: '#c0392b' },
        { id: 'i', idx: IDX.A, dx: 14, dy: -6, icon: img('pce/I.png'), tint: '#c0392b' },
      ],
      center: [{ id: 'run', idx: IDX.START, icon: img('pce/start_genesis.png'), tint: '#1c1c1c' }],
    },
    ngp: {
      label: 'NEO GEO POCKET', bodyColor: '#1c1c1e', bodyColor2: '#0a0a0b',
      dpad: {
        up: img('ngp/dpad-up.png'), down: img('ngp/dpad-down.png'),
        left: img('ngp/dpad-left.png'), right: img('ngp/dpad-right.png'), tint: '#2f2f2f',
      },
      buttons: [
        { id: 'b', idx: IDX.B, dx: -28, dy: 10, icon: img('ngp/B.png'), tint: '#333333' },
        { id: 'a', idx: IDX.A, dx: 8, dy: -8, icon: img('ngp/A.png'), tint: '#333333' },
      ],
      center: [{ id: 'start', idx: IDX.START, icon: img('ngp/start.png'), tint: '#1c1c1c' }],
    },
    ws: {
      label: 'WONDERSWAN', bodyColor: '#2c3a5e', bodyColor2: '#1b2740',
      // Real WonderSwan has TWO d-pad clusters (X and Y) — only X is
      // wired as the movement pad here, see file header note.
      dpad: {
        up: img('wonderswan/X1_wswan.png'), right: img('wonderswan/X2_wswan.png'),
        down: img('wonderswan/X3_wswan.png'), left: img('wonderswan/X4_wswan.png'), tint: '#12182c',
      },
      buttons: [
        { id: 'b', idx: IDX.B, dx: -26, dy: 10, icon: img('wonderswan/B_wswan.png'), tint: '#c9c9d0' },
        { id: 'a', idx: IDX.A, dx: 8, dy: -8, icon: img('wonderswan/A_wswan.png'), tint: '#c9c9d0' },
      ],
      center: [{ id: 'start', idx: IDX.START, icon: img('wonderswan/start_genesis.png'), tint: '#12182c' }],
    },
    wsc: null, // aliased to ws below
    vb: {
      label: 'VIRTUAL BOY', bodyColor: '#8f0f0f', bodyColor2: '#5c0808',
      dpad: {
        up: img('vb/dpad-up.png'), down: img('vb/dpad-down.png'),
        left: img('vb/dpad-left.png'), right: img('vb/dpad-right.png'), tint: '#1a1a1a',
      },
      buttons: [
        { id: 'b', idx: IDX.B, dx: -28, dy: 10, icon: img('vb/B.png'), tint: '#1a1a1a' },
        { id: 'a', idx: IDX.A, dx: 8, dy: -8, icon: img('vb/A.png'), tint: '#1a1a1a' },
      ],
      shoulders: [
        { id: 'l', idx: IDX.L, icon: img('vb/L.png'), tint: '#1a1a1a' },
        { id: 'r', idx: IDX.R, icon: img('vb/R.png'), tint: '#1a1a1a' },
      ],
      center: [
        { id: 'select', idx: IDX.SELECT, icon: img('vb/select_rounded_big.png'), tint: '#1a1a1a' },
        { id: 'start', idx: IDX.START, icon: img('vb/start_rounded_big.png'), tint: '#1a1a1a' },
      ],
    },
    a2600: {
      label: 'ATARI 2600', bodyColor: '#1c1c1e', bodyColor2: '#0a0a0b',
      // Real Atari joystick — a draggable stick driving digital d-pad
      // directions, not the CSS d-pad grid.
      joystick: { size: 100, bg: img('a2600/atari-stick-background.png'), nub: img('a2600/atari-stick.png') },
      buttons: [
        { id: 'fire', idx: IDX.A, dx: 0, dy: 0, size: 60, icon: img('a2600/atari-fire.png'), tint: '#c0392b' },
      ],
      center: [{ id: 'select', idx: IDX.SELECT, icon: img('a2600/atari-sel.png'), tint: '#1c1c1c' }],
    },
    lynx: {
      label: 'LYNX', bodyColor: '#a1312f', bodyColor2: '#6f201f',
      dpad: {
        up: img('lynx/dpad-up.png'), down: img('lynx/dpad-down.png'),
        left: img('lynx/dpad-left.png'), right: img('lynx/dpad-right.png'), tint: '#2a2a2a',
      },
      buttons: [
        { id: 'b', idx: IDX.B, dx: -26, dy: 10, icon: img('lynx/B.png'), tint: '#1a1a1a' },
        { id: 'a', idx: IDX.A, dx: 8, dy: -8, icon: img('lynx/A.png'), tint: '#1a1a1a' },
      ],
      center: [
        { id: 'opt1', idx: IDX.SELECT, icon: img('lynx/lynx_option1.png'), tint: '#1a1a1a' },
        { id: 'opt2', idx: IDX.START, icon: img('lynx/lynx_option2.png'), tint: '#1a1a1a' },
      ],
    },

    // ── No dedicated art in the pack — generic glyph set, real tint ───
    nds: {
      label: 'NINTENDO DS', bodyColor: '#efeff2', bodyColor2: '#c9c9d0',
      dpad: {
        up: img('generic/dpad-up.png'), down: img('generic/dpad-down.png'),
        left: img('generic/dpad-left.png'), right: img('generic/dpad-right.png'), tint: '#3a3a40',
      },
      // X/Y borrow the generic C/D glyphs — see file header note.
      buttons: [
        { id: 'x', idx: IDX.X, dx: 0, dy: -22, icon: img('generic/C.png'), tint: '#5a5a62' },
        { id: 'y', idx: IDX.Y, dx: -24, dy: 0, icon: img('generic/D.png'), tint: '#5a5a62' },
        { id: 'b', idx: IDX.B, dx: 0, dy: 22, icon: img('generic/B.png'), tint: '#5a5a62' },
        { id: 'a', idx: IDX.A, dx: 24, dy: 0, icon: img('generic/A.png'), tint: '#5a5a62' },
      ],
      shoulders: [
        { id: 'l', idx: IDX.L, icon: img('generic/L.png'), tint: '#5a5a62' },
        { id: 'r', idx: IDX.R, icon: img('generic/R.png'), tint: '#5a5a62' },
      ],
      center: [
        { id: 'select', idx: IDX.SELECT, icon: img('generic/dpad-left.png'), tint: '#5a5a62' },
        { id: 'start', idx: IDX.START, icon: img('generic/dpad-right.png'), tint: '#5a5a62' },
      ],
    },
    coleco: null, msx: null, intellivision: null, // filled by genericConsole() below
  };
  LAYOUTS.sega32x = Object.assign({}, LAYOUTS.segaMD, { label: '32X' });
  LAYOUTS.segaCD  = Object.assign({}, LAYOUTS.segaMD, { label: 'SEGA CD' });
  LAYOUTS.segaMS  = Object.assign({}, LAYOUTS.segaGG, { label: 'MASTER SYSTEM' });
  LAYOUTS.wsc     = Object.assign({}, LAYOUTS.ws, { label: 'WONDERSWAN COLOR' });
  LAYOUTS.ppsspp  = Object.assign({}, LAYOUTS.psx, { label: 'PSP', bodyColor: '#1e1e20', bodyColor2: '#0e0e10' });

  function genericConsole(label, bodyColor, bodyColor2, tint) {
    return {
      label, bodyColor, bodyColor2,
      dpad: {
        up: img('generic/dpad-up.png'), down: img('generic/dpad-down.png'),
        left: img('generic/dpad-left.png'), right: img('generic/dpad-right.png'), tint,
      },
      buttons: [
        { id: 'b', idx: IDX.B, dx: -28, dy: 10, icon: img('generic/B.png'), tint },
        { id: 'a', idx: IDX.A, dx: 8, dy: -8, icon: img('generic/A.png'), tint },
      ],
      shoulders: [
        { id: 'l', idx: IDX.L, icon: img('generic/L.png'), tint },
        { id: 'r', idx: IDX.R, icon: img('generic/R.png'), tint },
      ],
      center: [{ id: 'start', idx: IDX.START, icon: img('generic/A.png'), tint }],
    };
  }
  LAYOUTS.coleco        = genericConsole('COLECOVISION', '#1c1c1e', '#0a0a0b', '#c9c9d0');
  LAYOUTS.msx           = genericConsole('MSX', '#8a8a8a', '#5c5c5c', '#2a2a2a');
  LAYOUTS.intellivision = genericConsole('INTELLIVISION', '#8f5a2e', '#5e3a1c', '#d9a53f');

  function getLayout(core) {
    return LAYOUTS[core] || genericConsole(core.toUpperCase(), '#3a3a3a', '#222222', '#7c6af7');
  }

  // ── Style injection (once) ────────────────────────────────────────────
  let _styleInjected = false;
  function injectStyle() {
    if (_styleInjected) return;
    _styleInjected = true;
    const css = `
.rp-dock {
  position: relative; z-index: 6; flex: 0 0 auto;
  width: 100%; height: clamp(150px, 32vh, 280px);
  overflow: hidden;
  touch-action: none; -webkit-user-select: none; user-select: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --rp-scale: 1;
  background: linear-gradient(165deg, var(--rp-body-2, #2c2c34) 0%, var(--rp-body-1, #1c1c22) 100%);
  box-shadow: inset 0 6px 14px rgba(0,0,0,.32), inset 0 1px 0 rgba(255,255,255,.14), 0 -8px 22px rgba(0,0,0,.4);
  border-top: 1px solid rgba(255,255,255,.1);
}
.rp-dock::before {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: repeating-linear-gradient(115deg, rgba(255,255,255,.035) 0px, rgba(255,255,255,.035) 1px, transparent 1px, transparent 10px),
              radial-gradient(140% 90% at 50% -10%, rgba(255,255,255,.16), transparent 55%);
}
.rp-dock-label {
  position: absolute; top: 6px; left: 50%; transform: translateX(-50%);
  font-size: 9px; font-weight: 800; letter-spacing: .16em;
  color: rgba(0,0,0,.38); text-shadow: 0 1px 0 rgba(255,255,255,.18);
  pointer-events: none; white-space: nowrap;
}
.rp-dock.rp-dock-dark .rp-dock-label { color: rgba(255,255,255,.42); text-shadow: 0 1px 1px rgba(0,0,0,.5); }

.rp-el {
  position: absolute; pointer-events: auto;
  -webkit-tap-highlight-color: transparent; touch-action: none;
  transform: translate(-50%, -50%) scale(var(--rp-scale));
  transition: transform .05s ease, filter .05s ease;
}
.rp-el img { display: block; width: 100%; height: 100%; object-fit: contain; pointer-events: none; user-select: none; -webkit-user-drag: none; }
.rp-el.rp-pressed { transform: translate(-50%, -50%) scale(calc(var(--rp-scale) * .88)); filter: brightness(.8); }

.rp-btn { width: 46px; height: 46px; }
.rp-chip {
  border-radius: 50%;
  background: radial-gradient(circle at 35% 28%, rgba(255,255,255,.28), var(--rp-chip-c, #333) 75%);
  box-shadow: 0 3px 0 rgba(0,0,0,.4), 0 5px 10px rgba(0,0,0,.35), inset 0 1px 1px rgba(255,255,255,.25);
  padding: 4px; box-sizing: border-box;
}

.rp-dpad-full { width: var(--rp-dpad-size, 110px); height: var(--rp-dpad-size, 110px); }
.rp-dpad-cross { width: var(--rp-dpad-size, 110px); height: var(--rp-dpad-size, 110px); position: relative; }
.rp-dpad-cross-chip {
  position: absolute; inset: 0; border-radius: 22%;
  background: radial-gradient(circle at 38% 30%, rgba(255,255,255,.14), var(--rp-chip-c, #333) 72%);
  box-shadow: 0 3px 0 rgba(0,0,0,.4), 0 6px 12px rgba(0,0,0,.35), inset 0 1px 1px rgba(255,255,255,.14);
}
.rp-dpad-cross img { position: absolute; width: 30%; height: 34%; object-fit: contain; }
.rp-dpad-cross img.up    { left: 50%; top: 6%;  transform: translateX(-50%); }
.rp-dpad-cross img.down  { left: 50%; bottom: 6%; transform: translateX(-50%) rotate(180deg); }
.rp-dpad-cross img.left  { top: 50%; left: 6%; transform: translateY(-50%) rotate(-90deg); }
.rp-dpad-cross img.right { top: 50%; right: 6%; transform: translateY(-50%) rotate(90deg); }
.rp-dpad-hit { position: absolute; inset: 0; display: grid; grid-template-columns: repeat(3,1fr); grid-template-rows: repeat(3,1fr); }
.rp-dpad-hit-cell { position: relative; }
.rp-dpad-hit-cell.rp-pressed::before { content:''; position:absolute; inset:8%; background: rgba(255,255,255,.18); border-radius: 4px; }

.rp-shoulder { width: 58px; height: 30px; }
.rp-shoulder .rp-chip { border-radius: 8px 8px 3px 3px; }

.rp-pill { width: 54px; height: 24px; }
.rp-pill .rp-chip { border-radius: 999px; padding: 3px 6px; }

.rp-stick-wrap, .rp-joystick-wrap {
  width: var(--rp-stick-size, 100px); height: var(--rp-stick-size, 100px);
  position: relative;
}
.rp-stick-wrap img.bg, .rp-joystick-wrap img.bg { position: absolute; inset: 0; width: 100%; height: 100%; }
.rp-stick-wrap img.nub, .rp-joystick-wrap img.nub {
  position: absolute; width: 46%; height: 46%; left: 50%; top: 50%;
  transform: translate(-50%, -50%); pointer-events: none; transition: transform .04s ease;
}
`;
    const tag = document.createElement('style');
    tag.id = 'rp-skin-style';
    tag.textContent = css;
    document.head.appendChild(tag);
  }

  // ── Input plumbing ─────────────────────────────────────────────────
  const _heldCounts = new Map();
  function simulate(idx, value) {
    const em = global.EJS_emulator;
    if (!em || !em.gameManager || typeof em.gameManager.simulateInput !== 'function') return;
    try { em.gameManager.simulateInput(0, idx, value); } catch (e) { /* core not ready */ }
  }
  function pressIdx(idx) {
    const c = (_heldCounts.get(idx) || 0) + 1;
    _heldCounts.set(idx, c);
    if (c === 1) simulate(idx, 1);
  }
  function releaseIdx(idx) {
    const c = (_heldCounts.get(idx) || 0) - 1;
    if (c <= 0) { _heldCounts.delete(idx); simulate(idx, 0); }
    else _heldCounts.set(idx, c);
  }
  function releaseAll() {
    for (const idx of _heldCounts.keys()) simulate(idx, 0);
    _heldCounts.clear();
  }
  function vibrate(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* ignore */ } }

  function pct(n) { return n + '%'; }

  function iconEl(src, alt) {
    const im = document.createElement('img');
    im.src = src;
    im.alt = alt || '';
    im.draggable = false;
    return im;
  }

  // ── Element builders ───────────────────────────────────────────────
  function makeButton(def, anchor) {
    const el = document.createElement('div');
    el.className = 'rp-el rp-btn';
    el.style.left = pct(anchor.x);
    el.style.top = pct(anchor.y);
    el.style.transform = `translate(calc(-50% + ${def.dx}px), calc(-50% + ${def.dy}px)) scale(var(--rp-scale))`;
    const size = def.size || 46;
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    if (def.tint) {
      const chip = document.createElement('div');
      chip.className = 'rp-chip';
      chip.style.width = '100%'; chip.style.height = '100%';
      chip.style.setProperty('--rp-chip-c', def.tint);
      chip.appendChild(iconEl(def.icon, def.id));
      el.appendChild(chip);
    } else {
      el.appendChild(iconEl(def.icon, def.id));
    }
    el.dataset.rpIdx = String(def.idx);
    wireMomentary(el, [def.idx]);
    return el;
  }

  function makeShoulder(def, xPct, yPct) {
    const el = document.createElement('div');
    el.className = 'rp-el rp-shoulder';
    el.style.left = pct(xPct);
    el.style.top = pct(yPct);
    const chip = document.createElement('div');
    chip.className = 'rp-chip';
    chip.style.width = '100%'; chip.style.height = '100%';
    if (def.tint) chip.style.setProperty('--rp-chip-c', def.tint);
    chip.appendChild(iconEl(def.icon, def.id));
    el.appendChild(chip);
    wireMomentary(el, [def.idx]);
    return el;
  }

  function makeCenterButton(def, xPct, yPct) {
    const el = document.createElement('div');
    el.className = 'rp-el rp-pill';
    el.style.left = pct(xPct);
    el.style.top = pct(yPct);
    const chip = document.createElement('div');
    chip.className = 'rp-chip';
    chip.style.width = '100%'; chip.style.height = '100%';
    if (def.tint) chip.style.setProperty('--rp-chip-c', def.tint);
    chip.appendChild(iconEl(def.icon, def.id));
    el.appendChild(chip);
    wireMomentary(el, [def.idx]);
    return el;
  }

  function wireMomentary(el, indices) {
    let down = false;
    const start = (e) => {
      e.preventDefault();
      if (down) return;
      down = true;
      el.classList.add('rp-pressed');
      indices.forEach(pressIdx);
      vibrate(10);
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    };
    const end = () => {
      if (!down) return;
      down = false;
      el.classList.remove('rp-pressed');
      indices.forEach(releaseIdx);
    };
    el.addEventListener('pointerdown', start, { passive: false });
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);
  }

  // D-pad — either one full-cross image (TIER 1) or 4 directional images
  // arranged in a cross (TIER 2), with an invisible 3x3 hit-grid on top
  // for diagonal presses and finger-slide-between-directions.
  function makeDpad(def, anchor) {
    const wrap = document.createElement('div');
    wrap.className = 'rp-el';
    wrap.style.left = pct(anchor.x);
    wrap.style.top = pct(anchor.y);
    wrap.style.setProperty('--rp-dpad-size', (def.size || 110) + 'px');

    if (def.icon) {
      wrap.classList.add('rp-dpad-full');
      wrap.appendChild(iconEl(def.icon, 'dpad'));
    } else {
      wrap.classList.add('rp-dpad-cross');
      const chip = document.createElement('div');
      chip.className = 'rp-dpad-cross-chip';
      if (def.tint) chip.style.setProperty('--rp-chip-c', def.tint);
      wrap.appendChild(chip);
      const up = iconEl(def.up); up.className = 'up';
      const down = iconEl(def.down); down.className = 'down';
      const left = iconEl(def.left); left.className = 'left';
      const right = iconEl(def.right); right.className = 'right';
      wrap.appendChild(up); wrap.appendChild(down); wrap.appendChild(left); wrap.appendChild(right);
    }

    const hit = document.createElement('div');
    hit.className = 'rp-dpad-hit';
    const cellMap = [
      [IDX.UP, IDX.LEFT], [IDX.UP], [IDX.UP, IDX.RIGHT],
      [IDX.LEFT], [], [IDX.RIGHT],
      [IDX.DOWN, IDX.LEFT], [IDX.DOWN], [IDX.DOWN, IDX.RIGHT],
    ];
    const cells = [];
    for (let i = 0; i < 9; i++) {
      const c = document.createElement('div');
      c.className = 'rp-dpad-hit-cell';
      hit.appendChild(c);
      cells.push(c);
    }
    wrap.appendChild(hit);

    const pointers = new Map();
    function cellAt(clientX, clientY) {
      const rect = wrap.getBoundingClientRect();
      let cx = (clientX - rect.left) / rect.width;
      let cy = (clientY - rect.top) / rect.height;
      cx = Math.min(0.999, Math.max(0, cx));
      cy = Math.min(0.999, Math.max(0, cy));
      return Math.floor(cy * 3) * 3 + Math.floor(cx * 3);
    }
    function applyCell(pointerId, cellIndex) {
      const prev = pointers.get(pointerId);
      if (prev && prev.cellIndex === cellIndex) return;
      if (prev) { prev.indices.forEach(releaseIdx); cells[prev.cellIndex].classList.remove('rp-pressed'); }
      const indices = cellMap[cellIndex];
      indices.forEach(pressIdx);
      cells[cellIndex].classList.add('rp-pressed');
      pointers.set(pointerId, { cellIndex, indices });
    }
    function releasePointer(pointerId) {
      const prev = pointers.get(pointerId);
      if (!prev) return;
      prev.indices.forEach(releaseIdx);
      cells[prev.cellIndex].classList.remove('rp-pressed');
      pointers.delete(pointerId);
    }
    wrap.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try { wrap.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      applyCell(e.pointerId, cellAt(e.clientX, e.clientY));
      vibrate(8);
    }, { passive: false });
    wrap.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId)) return;
      applyCell(e.pointerId, cellAt(e.clientX, e.clientY));
    });
    wrap.addEventListener('pointerup', (e) => releasePointer(e.pointerId));
    wrap.addEventListener('pointercancel', (e) => releasePointer(e.pointerId));
    wrap.addEventListener('lostpointercapture', (e) => releasePointer(e.pointerId));

    return wrap;
  }

  // Analog stick (N64) — digital 4-direction emulation via the confirmed
  // 16-19 slots, real thumbstick art, nub follows the finger.
  function makeStick(def, anchor) {
    const wrap = document.createElement('div');
    wrap.className = 'rp-el rp-stick-wrap';
    wrap.style.left = pct(anchor.x);
    wrap.style.top = pct(anchor.y);
    wrap.style.setProperty('--rp-stick-size', (def.size || 100) + 'px');
    const bg = iconEl(def.bg); bg.className = 'bg';
    const nub = iconEl(def.nub); nub.className = 'nub';
    wrap.appendChild(bg); wrap.appendChild(nub);
    wireStickLike(wrap, nub, [IDX.STICK_R, IDX.STICK_L, IDX.STICK_D, IDX.STICK_U]);
    return wrap;
  }

  // Real joystick (Atari 2600) — same drag mechanic, drives digital
  // d-pad directions instead of the analog-stick slots.
  function makeJoystick(def, anchor) {
    const wrap = document.createElement('div');
    wrap.className = 'rp-el rp-joystick-wrap';
    wrap.style.left = pct(anchor.x);
    wrap.style.top = pct(anchor.y);
    wrap.style.setProperty('--rp-stick-size', (def.size || 100) + 'px');
    const bg = iconEl(def.bg); bg.className = 'bg';
    const nub = iconEl(def.nub); nub.className = 'nub';
    wrap.appendChild(bg); wrap.appendChild(nub);
    wireStickLike(wrap, nub, [IDX.RIGHT, IDX.LEFT, IDX.DOWN, IDX.UP]);
    return wrap;
  }

  function wireStickLike(wrap, nub, dirIdx) {
    const [R, L, D, U] = dirIdx;
    let activeId = null, held = [];
    function apply(clientX, clientY) {
      const rect = wrap.getBoundingClientRect();
      const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
      const dx = clientX - cx, dy = clientY - cy;
      const r = rect.width / 2;
      const dist = Math.min(1, Math.hypot(dx, dy) / r);
      const angle = Math.atan2(dy, dx);
      nub.style.transform = `translate(calc(-50% + ${Math.cos(angle) * dist * r * 0.4}px), calc(-50% + ${Math.sin(angle) * dist * r * 0.4}px))`;
      const next = [];
      const dead = 0.28;
      if (dist > dead) {
        if (dx > r * dead) next.push(R);
        if (dx < -r * dead) next.push(L);
        if (dy > r * dead) next.push(D);
        if (dy < -r * dead) next.push(U);
      }
      held.filter(i => !next.includes(i)).forEach(releaseIdx);
      next.filter(i => !held.includes(i)).forEach(pressIdx);
      held = next;
    }
    function reset() { held.forEach(releaseIdx); held = []; nub.style.transform = 'translate(-50%,-50%)'; }
    wrap.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (activeId !== null) return;
      activeId = e.pointerId;
      try { wrap.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      apply(e.clientX, e.clientY);
    }, { passive: false });
    wrap.addEventListener('pointermove', (e) => { if (e.pointerId === activeId) apply(e.clientX, e.clientY); });
    const end = (e) => { if (e.pointerId !== activeId) return; activeId = null; reset(); };
    wrap.addEventListener('pointerup', end);
    wrap.addEventListener('pointercancel', end);
    wrap.addEventListener('lostpointercapture', end);
  }

  // ── Hide EmulatorJS's own default touch overlay ───────────────────
  let _nativeObserver = null;
  function hideNativeOverlay(playerRoot) {
    if (!playerRoot) return;
    const sweep = () => {
      Array.from(playerRoot.querySelectorAll('*')).forEach(el => {
        if (el.closest('.rp-dock')) return;
        if (el.tagName === 'CANVAS') return;
        if (el.dataset && el.dataset.rpSkinIgnore) return;
        const cls = (el.className || '') + '';
        if (/gamepad|dpad|joystick|touch-control|virtual-controller/i.test(cls) || /gamepad|dpad|joystick/i.test(el.id || '')) {
          el.style.display = 'none';
          el.dataset.rpSkinIgnore = '1';
        }
      });
    };
    sweep();
    if (_nativeObserver) _nativeObserver.disconnect();
    _nativeObserver = new MutationObserver(sweep);
    _nativeObserver.observe(playerRoot, { childList: true, subtree: true });
  }
  function stopHidingNativeOverlay() {
    if (_nativeObserver) { _nativeObserver.disconnect(); _nativeObserver = null; }
  }

  function isDarkColor(hex) {
    try {
      const n = parseInt(hex.replace('#', ''), 16);
      const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
      return (0.299 * r + 0.587 * g + 0.114 * b) < 140;
    } catch (e) { return true; }
  }

  // ── Public attach/detach ──────────────────────────────────────────
  let enabled = true;
  let root = null;
  let resizeHandler = null;
  let _dockRO = null;

  function isTouchDevice() {
    try { return matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0; }
    catch (e) { return false; }
  }

  function applyResponsiveScale(dock) {
    if (!root) return;
    const w = dock.clientWidth || 380, h = dock.clientHeight || 200;
    const scaleW = Math.max(0.66, Math.min(1.1, w / 480));
    const scaleH = Math.max(0.66, Math.min(1.1, h / 210));
    root.style.setProperty('--rp-scale', String(Math.min(scaleW, scaleH)));
  }

  function build(core, stage) {
    injectStyle();
    const layout = getLayout(core);

    const dock = document.createElement('div');
    dock.className = 'rp-dock' + (isDarkColor(layout.bodyColor) ? ' rp-dock-dark' : '');
    dock.dataset.rpSkin = core;
    dock.setAttribute('aria-hidden', 'true');
    dock.style.setProperty('--rp-body-1', layout.bodyColor);
    dock.style.setProperty('--rp-body-2', layout.bodyColor2 || layout.bodyColor);

    if (layout.label) {
      const label = document.createElement('div');
      label.className = 'rp-dock-label';
      label.textContent = layout.label;
      dock.appendChild(label);
    }

    if (layout.dpad) {
      const anchor = layout.dpad.anchor || (layout.stick || layout.joystick ? DPAD_ANCHOR_WITH_STICK : DPAD_ANCHOR);
      dock.appendChild(makeDpad(layout.dpad, anchor));
    }
    if (layout.stick) dock.appendChild(makeStick(layout.stick, layout.stick.anchor || STICK_ANCHOR));
    if (layout.joystick) dock.appendChild(makeJoystick(layout.joystick, layout.joystick.anchor || DPAD_ANCHOR));

    const faceAnchor = layout.faceAnchor || FACE_ANCHOR;
    (layout.buttons || []).forEach(b => dock.appendChild(makeButton(b, faceAnchor)));

    (layout.shoulders || []).forEach((s, i) => {
      const side = s.side || (i % 2 === 0 ? 'left' : 'right');
      const row = s.row || 1;
      const y = row === 1 ? SHOULDER_Y : SHOULDER_Y_ROW2;
      const x = side === 'left' ? 10 : side === 'right' ? 90 : 50;
      dock.appendChild(makeShoulder(s, x, y));
    });

    (layout.center || []).forEach((c, i) => {
      const n = (layout.center || []).length;
      const x = 50 + (i - (n - 1) / 2) * 15;
      dock.appendChild(makeCenterButton(c, x, CENTER_Y));
    });

    stage.appendChild(dock);
    root = dock;
    applyResponsiveScale(dock);
    resizeHandler = () => applyResponsiveScale(dock);
    window.addEventListener('resize', resizeHandler);
    window.addEventListener('orientationchange', resizeHandler);
    if (window.ResizeObserver) { _dockRO = new ResizeObserver(resizeHandler); _dockRO.observe(dock); }

    hideNativeOverlay(document.getElementById('game') || stage);
  }

  function teardown() {
    releaseAll();
    stopHidingNativeOverlay();
    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler);
      window.removeEventListener('orientationchange', resizeHandler);
      resizeHandler = null;
    }
    if (_dockRO) { _dockRO.disconnect(); _dockRO = null; }
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null;
  }

  function attach(core, stage) {
    teardown();
    if (!enabled) return;
    if (!stage) return;
    if (!isTouchDevice()) return;
    build(core, stage);
  }
  function detach() { teardown(); }
  function setEnabled(v) { enabled = !!v; }
  function isEnabled() { return enabled; }

  // Colour lookup only — no DOM, no touch-gating. Used by index.html to
  // theme the screen bezel/plaque on EVERY device (desktop included),
  // independent of whether the touch dock itself gets built. Keeps the
  // dock and the screen surround visually the same "shell" even on a
  // mouse-only machine that never gets a dock at all.
  function getBodyColors(core) {
    const l = getLayout(core);
    return { label: l.label, bodyColor: l.bodyColor, bodyColor2: l.bodyColor2 || l.bodyColor };
  }

  global.RPControllerSkins = { attach, detach, setEnabled, isEnabled, getBodyColors };
})(window);
