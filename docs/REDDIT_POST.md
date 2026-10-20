# Reddit post draft (r/VirtualDJ)

**Title:** I made a free hardware-controller style skin for the VirtualDJ Remote app (2560x1600 tablets), open source

**Body:**

I wasn't happy with the stock Remote layout on my tablet, so I built a skin that looks and behaves more like a
DDJ-style controller, and I'm sharing it in case it is useful to anyone else.

**What it has**

- Two stacked colour scratchwaves with a beat-tick lane between them
- Jog discs with phase rings, a pitch fader with a zero arrow (slow reset), big CUE / PLAY
- Pad tabs: Hot Cues, Stems 2.0, Slicer, Beatjump, with a SHIFT for deleting hot cues
- Desktop-style mixer: pointer knobs (tap the label to reset, it shows the % when off centre), faders, VU, PFL, crossfader
- Shared beat / phrase counter, key shift display with reset, a loop row (in / out / halve / double)
- Automix controls (automix, shuffle, next), an automix queue list, a hamburger menu for sampler / loop / FX
- Blinking: PLAY while paused, jog ring in the last 30 s of a track

**Running on:** Galaxy Tab S9 FE+ (2560x1600), VirtualDJ build 9644, Remote 8.0.64. I would love for you to try it on your own tablet and tell me how it looks. Screenshots, device and resolution, and any layout problems are all welcome.

**Honest limitations**

- The Remote can't draw a beat grid inside a scratchwave, so the beat ticks come from a separate rhythm zone and
  may not line up perfectly with the waveform.
- A few features rely on script verbs I took from the docs and could not fully verify on every setup (shuffle,
  the range cycle, the automix LOAD behaviour).
- It can't show VirtualDJ's browser or track lists on the tablet.

It is unofficial and not affiliated with Atomix. It's generated from code (Node.js), and the repo has the source,
tests and an install guide: https://github.com/guneethind/vdj-tablet-deck-skin

Download the zip from the Releases page, copy it (don't unzip) into `%LOCALAPPDATA%\VirtualDJ\RemoteSkins` and
`...\Skins`, restart VirtualDJ and select it. Feedback and screenshots from other devices are very welcome.

*(Attach docs/screenshot.jpg, a real screenshot from the tablet, and ideally 1-2 more.)*
