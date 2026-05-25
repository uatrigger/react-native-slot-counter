# Changelog

## 0.1.0 — 2026-05-25

Initial release.

- `<SlotCounter>` unified component with `renderer="text" | "image"` discriminator
- Text renderer (per-digit slot animation with Skia text glyphs)
- Image renderer (per-digit slot animation with custom image strips)
- Three roll styles: `spin` (casino-style), `mechanical` (continuous), `digital` (drop-in)
- Per-slot styling: backgrounds, borders, padding, radius
- Container chrome styling
- Configurable motion: `spring` or `casino` (tween with timed easing)
- Imperative API: `setTarget`, `addDelta`, `jumpTo`, `getCurrent`, `getTarget`
- Direct access to underlying components: `SkiaRollingOdometer`, `SkiaImageOdometer`, `SkiaOdometer`
