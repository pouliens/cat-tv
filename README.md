# CAT TV

A tiny fullscreen web app of motion scenes for cats, meant to be played on a TV, tablet, or phone. There is no build step — just static HTML, CSS, and JavaScript.

Open the live site (once published) and press **Start**. That click unlocks audio on mobile and TV browsers, asks for fullscreen, and requests a screen wake lock so the device is less likely to doze off mid-fish.

## How to use it

1. Open the page on the screen your cat can see.
2. Press **Start**. Allow fullscreen if the browser asks.
3. Move the pointer, tap the screen, or press **Enter** to show settings. The panel hides itself after a few seconds.
4. Leave it running. Scenes rotate on their own, or skip with the on-screen buttons / a remote.

### Controls

| Action | How |
| --- | --- |
| Show or hide settings | Tap, move the pointer, or press Enter |
| Next / previous scene | On-screen buttons, Left/Right (or Up/Down) arrow keys, TV remote arrows |
| Fullscreen | The fullscreen button, or `F` |
| Mute | The Sound toggle, or `M` |
| Hide settings | Close button or Escape |

Settings are stored in `localStorage` on that device: which scenes are in the playlist, how long each stays (30 seconds, 1, 2, 5, 10, or 30 minutes, or a custom number of seconds), shuffle vs in order, and sound / volume.

## Scenes

All art is original. The interface uses inline SVG icons and a system font stack, so it does not depend on icon fonts or Google Fonts. All sounds are synthesized in the browser with the Web Audio API — there are no audio files and no trademarked logos.

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

Useful query flags (handy for testing):

- `?autostart=1&scene=aquarium` — skip the start screen and jump to a scene
- `&sound=0` — start muted
- `&nofullscreen=1` — do not request fullscreen
- `&hideui=1` — keep the settings panel hidden

## Publish on GitHub Pages

This repo is set up to serve from the root of the `main` branch. In the GitHub repo: **Settings → Pages → Deploy from a branch → `main` / `/` (root)**. After the first deploy the site is typically at:

`https://pouliens.github.io/cat-tv/`

## Notes

- Wake lock and fullscreen depend on the browser. Some Smart TV and iOS browsers ignore one or both; the scenes still run.
- TV browsers can be underpowered. The canvas caps resolution so it stays smooth, but if a set-top box stutters, try turning off a couple of busy scenes (fireflies, aquarium).
- Keep volume modest at first — chirps are meant to be bright, and a quiet room can make them feel louder than expected.
