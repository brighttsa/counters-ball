# Optional Location Photography

The game ships with no photographs and makes no photograph requests by default.
Procedural ground, walls, props and lighting always remain. A licensed image can
fill distant openings behind them; the regular downward gameplay camera may see
very little of it. Establishing and lower camera angles reveal more of the plane.
Do not remove the real foreground or wall just to expose a photograph.

The default plane is high and wide beyond the wall. These dimensions are starting
values, not verified framing: no actual photograph has been loaded or visually
verified. Browser/GPU checks remain pending because the admin policy check was
unavailable; CPU lifecycle tests do not establish visual quality or visibility.

## Supply and Enable

Supply your own licensed image through the same site's static hosting. Nothing
downloads images into this repository. Record the creator, license and any
required attribution before enabling it. Attribution metadata is configuration,
not an automatically displayed credit: publish required credits with your release.
Prefer a wide, modest-resolution image (about 2048 pixels wide) with no close
people, tables or objects whose perspective would compete with the 3D foreground.

Edit `LOCATION_PHOTOGRAPHS` in
`src/scene/environment/location-photograph-configuration.js`, using existing keys:

| Key | Actual setting |
| --- | --- |
| schoolyard | Adabraka Primary, Accra |
| kiosk | Nima Market Road |
| veranda | Auntie Ama's Veranda, Kumasi |
| roadside | Tema Motorway Junction |
| harmattan | Tamale Lorry Station |
| night | Jamestown, under the kiosk bulb |

Set `enabled: true`, `path: '/licensed-locations/example.webp'`, `credit` and
`license`. Only root-relative HTTP(S) same-origin paths are accepted; redirects
are rejected. Missing files, disabled configuration, decoding failures or missing
attribution preserve the procedural fallback. No image is supplied by this change.

## Composition Controls

- `horizon`: image horizon measured 0..1 down from the original image top.
- `horizonY`: world height at which that horizon lands; calibrate to the camera.
- `focal`: original-image focal point, x from left and y from top, both 0..1.
- `crop`: fractions of image width and height retained; choose a crop with the
  same aspect ratio as `width / height` to avoid image stretching.
- `width`, `height`, `z`: plane dimensions and depth, behind the wall (default -24).
- `exposure`: photographic exposure offset in stops, before scene tone mapping.
- `grade`: linear RGB multipliers; keep restrained and match the venue key light.
- `haze`: 0..1 blend toward venue fog colour, independent of scene fog distance.
- `parallax`: lateral camera displacement multiplier, capped at 0.3 world units.
  Set to zero for fixed imagery or reduced-motion presentation.

The material softly fades its borders. Existing opaque geometry supplies real
occlusion. The photograph writes no depth; the existing depth-of-field background
remains soft without making a second photographic focus plane. Check crop,
horizon, wall overlap and exposure at every intended camera angle before release.

## Runtime Contract

`buildLevelStage({...existingArgs, camera?, photograph?})` accepts an optional
camera for lateral parallax and an optional configuration override for that stage.
Defaults are keyed by `level.backdrop`. No required context changes exist.
The existing `stage.backdrop.update(t, dt)` drives fade and environment time;
skip updates during pause. Stage disposal aborts pending fetches, rejects late
decodes, closes image bitmaps and frees photograph GPU resources.

Audio integration: `sound.event(name, strength=0.5)`, `setHeat(0..1)`,
`setPaused(bool)`, and `setAmbience(level.backdrop)` are available. Old material
methods and day/night/harmattan ambience calls remain supported (`day` = kiosk).
Pause suspends the audio context, including scheduled cues and ambience LFOs;
resume it on leaving pause. `sound.dispose()` closes the context at app teardown.
Heat increases the bed gently, with no music or physics changes.
