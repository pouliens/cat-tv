# CAT TV

A tiny fullscreen web app of motion scenes for cats, meant to be played on a TV, tablet, or phone. There is no build step — just static HTML, CSS, and JavaScript.

Open [Cat TV](https://pouliens.github.io/cat-tv/) on a TV, tablet, or phone. A random enabled scene starts immediately. After that, scenes follow the saved playlist order or shuffle setting. Open the [scene guide](https://pouliens.github.io/cat-tv/?guide=1) to browse the original animations or play a specific scene.

## Playback and TV controls

| Action | How |
| --- | --- |
| Enable sound when prompted | Press OK / Enter while watching, or tap **Enable sound**. The player remembers an intentional mute. |
| Show controls | Move the pointer, tap **Controls** in the top corner on a touchscreen, or press Tab. OK / Enter from the scene focuses the toolbar once audio is enabled. |
| Play with a scene | Tap the picture or click it with a mouse. Fish dart, birds lift off, toys move and fireflies gather around the touch. |
| Change scene | Press a directional key while watching, or use Previous and Next on the toolbar. |
| Browse and edit | Use the directional pad to focus a control, then OK to activate it. The grid button opens the guide and the gear opens settings. |
| Leave settings | Close, Escape or the remote’s Back key when delivered by the browser. |
| Fullscreen | Use the fullscreen button or F on supported browsers. |
| Mute | Use the speaker button or M. |

New sessions default to 35% app volume. Settings are stored in `localStorage` on that device: which scenes are in the playlist, how long each stays (30 seconds, 1, 2, 5, 10, or 30 minutes, or a custom number of seconds), shuffle vs in order, and sound / volume.

## Scenes

All art is original. The interface uses inline SVG icons and a system font stack, so it does not depend on icon fonts or Google Fonts. All ten scenes have sound cues synthesized in the browser with the Web Audio API — there are no audio files and no trademarked logos.

1. **Aquarium** — fish of mixed sizes and colours, rising bubbles, swaying seaweed, and the occasional dart.
2. **Bouncing Logo** — a typographic “CAT TV” badge bounces off the edges, changes colour on each hit, and celebrates a corner strike.
3. **Meow Intro** — a looping red-ribbon letter “M” (for meow) with streaking colour lines. An homage, not a copy of any streaming-service ident.
4. **Birds** — birds hop along a branch and fly across a garden, with generated chirps in mixed patterns.
5. **Laser Pointer** — a glowing dot that pauses, crawls, jitters, and zips across a dim room.
6. **Mice** — mice scurry in from the edges, freeze, hide, and peek out of holes, a box, and a plant pot.
7. **Butterflies** — butterflies flutter and occasionally land on flowers in a meadow.
8. **Wand Toy** — a feather wand swings, traces a figure-eight, twitches, drags, and yanks, like someone playing with a cat.
9. **Yarn Ball** — a ball of yarn rolls around the rug and leaves an unravelling trail.
10. **Fireflies** — a night meadow of blinking, drifting lights, with very quiet cricket-like pulses.

You can turn any scene off in the playlist. New scenes can be added later without changing the player: drop a class in `js/scenes/`, then register it in `js/scenes/registry.js`. Themes are reserved for later; the registry already has a `THEMES` map (today only `classic`).

## Theme ideas for later

- Day / night tints, or a high-contrast “cat vision” palette
- A bird-feeder close-up, or a pond seen from above
- Rain on a window, autumn leaves, or a snowy windowsill
- Squirrels on a fence, bugs on a patio, a hamster wheel
- Seasonal holiday colourways for the existing scenes
- A “calm night” playlist that prefers fireflies, the aquarium, and yarn

## Run it locally

Any static file server works. From this folder:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`. Opening the HTML file directly (`file://`) may block modules or audio in some browsers, so a local server is the reliable option.

Useful query flags:

- `?scene=aquarium` — start with a specific scene
- `?guide=1` or `?autostart=0` — open the scene guide
- `&sound=0` — start muted
- `&nofullscreen=1` — do not request fullscreen
- `&hideui=1` — keep the settings panel hidden

## Publish on GitHub Pages

This repo is set up to serve from the root of the `main` branch. In the GitHub repo: **Settings → Pages → Deploy from a branch → `main` / `/` (root)**. After the first deploy the site is typically at:

`https://pouliens.github.io/cat-tv/`

## Notes

- Wake lock and fullscreen depend on the browser. Some Smart TV and iOS browsers ignore one or both; the scenes still run.
- The canvas caps its longest rendering edge at 1920 pixels, including on 4K displays. Screen size, browser support and GPU performance vary across TVs.
- Aquarium bubbles, bird calls, meadow and feather rustles, mouse footfalls, soft yarn taps and short tonal cues use gradual attacks and releases. Each scene spaces its cues at least 1.8 seconds apart. The TV’s own volume also affects playback.
