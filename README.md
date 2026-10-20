# VDJ Remote Hardware Skin

A hardware-controller style skin for the **VirtualDJ Remote** app, designed for **2560 x 1600** tablets.
It replaces the stock Remote layout with a two-deck, DDJ-style surface: stacked colour scratchwaves, jog
discs, performance pads, a desktop-style mixer and a shared beat/phrase counter.

![Preview](docs/preview.png)

> The preview is a reference render from this repo's own renderer. Track data, waveforms and album art are
> placeholders; on the tablet VirtualDJ draws those.

**Unofficial.** Not affiliated with or endorsed by Atomix Productions. The repo contains no Atomix artwork or
skin files; the skin is generated entirely from code in `src/`. It uses VirtualDJ's built-in system icons by
name for play and stop.

## What you get

- Two stacked colour scratchwaves with a beat-tick lane between them (deck A blue ticks, deck B red ticks)
- Song info strip per deck: cover, title, artist, time, BPM, key shift (`<` offset `>` and reset), colourful overview
- Master-deck tab (A / B) that lights only for the master deck
- Jog disc with phase ring that blinks in the last 30 s (follows VirtualDJ's end-of-song warning), BPM / pitch / time inside
- Corner buttons: RANGE (cycles 6 / 12 / 18 / 24 / 30 %), VINYL, KEY LOCK, SLIP
- Pitch fader with zero arrow (slow reset), +/- bend, large CUE and PLAY (PLAY blinks when paused)
- Pad tabs: HOTCUES, STEMS 2.0, SLICER, BEATJUMP, plus SHIFT (hot cues: delete)
- Loop row: IN, OUT, halve / length / double, SYNC
- Mixer: HIGH / MID / LOW / FILTER / GAIN pointer knobs (tap the label to reset to centre; it shows the % when off centre),
  level faders and VU meters, PFL, crossfader with centre-reset arrow
- Shared beat counter: two 16-beat phrase rings and 4-beat boxes (deck A top, deck B bottom)
- Automix: AUTOMIX, SHUFFLE, NEXT; hamburger menu for Sampler, Loop, Effects and an Automix queue list
- LOAD A / LOAD B load from the automix list when it has songs, otherwise the browser selection

## Tested on

| | |
|---|---|
| VirtualDJ | build 9644 (Windows) |
| Remote app | 8.0.64 |
| Tablet | Samsung Galaxy Tab S9 FE+ (2560 x 1600) |

Other devices and resolutions are untested. The skin is authored at a fixed 2560 x 1600 canvas.

## Install

1. Download `HW Controller Remote v3.0.0.zip` from the [Releases](../../releases) page. **Do not unzip it.**
2. Copy the zip into both folders (create them if they do not exist):
   - `%LOCALAPPDATA%\VirtualDJ\RemoteSkins`
   - `%LOCALAPPDATA%\VirtualDJ\Skins`
3. Restart VirtualDJ.
4. Select **HW Controller Remote** as the skin for the Remote (in VirtualDJ's Settings, and/or from the skin
   list in the Remote app; menu names vary between versions).
5. Reconnect the Remote. The bottom of the mixer shows `Version 3.0.0 | Build ...`, which tells you which
   build is loaded.

If the Remote shows a "No page skin" error, the zip was unzipped or re-zipped with a folder inside. The zip
must be flat: `skin.xml`, `skin.png`, `preview.png` at the top level.

If you update to a new file and still see the old layout, select another skin and then this one again,
and reconnect the Remote. The build stamp tells you if you are on the new file.

### Host settings that affect the look

These are VirtualDJ options (Settings, then search the option name). They are not changed by the skin.

| Option | Suggested | Effect |
|---|---|---|
| `skinWaveformType` | `colors` | Colourful top scratchwaves |
| `skinOverviewType` | `colors` | Overview strip under the song info |
| `endOfSongWarning` | `30` | Seconds before the end when the jog ring starts blinking |

## Build from source

Requires Node.js 18 or newer.

```bash
npm ci
npm test
npm run build            # writes dist/HW Controller Remote v3.0.0.zip
npm run install:local    # also copies it into the Windows VirtualDJ folders
```

How it works: `src/skin.js` describes the layout in code. Sprites are drawn as SVG, packed into one atlas PNG
(`src/atlas.js`), and the XML is emitted with every coordinate as an absolute integer. `src/validate.js` is a
hard build gate: it fails the build on relative coordinates, elements outside the canvas, touch targets under
64 px, sprites that do not match their element size, non-hex colours and elements not known to work on the Remote.
`src/preview.js` is a small renderer that follows VirtualDJ's positioning rules and is used by the tests.

## Known limitations

- Several behaviours depend on VirtualDJ script verbs that were taken from the documentation and not all have been
  exercised on every setup: `playlist_randomize` (SHUFFLE), `pitch_range` with a list (RANGE cycle),
  `songpos_warning ? blink : true` (jog ring blink), and the automix LOAD behaviour (including moving the loaded
  song to the bottom of the automix list, which relies on the PC's browser focus).
- The Remote cannot draw a beat grid inside a scratchwave, so beat ticks come from a rhythm zone that has its own
  zoom. The ticks may not line up exactly with the scratchwave beats.
- The skin cannot show VirtualDJ's browser or track lists; LOAD uses the selection made on the PC.
- SHIFT only affects the HOTCUES tab.
- The knob label shows the knob's position as a percentage, not a dB value.

## Contributing

Issues and pull requests are welcome, especially device reports (tablet model and resolution) and screenshots.
Please run `npm test` before opening a pull request.

## License

MIT. See `LICENSE`.
