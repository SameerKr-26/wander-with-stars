# WWS brand assets

**Status: awaiting a properly exported brand asset from the original artwork.**

The file currently sitting in this folder is deliberately **not committed** and
must not be. It is a working copy only.

## Why the current file is not in version control

`Brand_logo.PNG` (untracked) has three problems:

| Issue | Detail |
|---|---|
| Format mismatch | The bytes are **JPEG** (`FF D8 FF E1`), not PNG. Served by extension, it would be sent as `image/png` — an incorrect `Content-Type`. |
| No transparency | JPEG cannot store an alpha channel, so the mark carries a baked-in background and cannot sit over photography or a teal surface. |
| Embedded metadata | EXIF carries source-tool document and user identifiers plus an agency name. This repository is **public**, and once pushed that metadata is permanent in git history and painful to remove. |

For reference, the working copy measures 4419 × 4419 px, 450 KB, baseline JPEG,
8-bit, 3-component.

## What the replacement should be

Provided by the product owner, exported from the original artwork. Not redrawn,
recreated, traced, recoloured, reproportioned, or AI-generated.

Useful properties, in rough order of value:

- **SVG** preferred — resolution-independent, tiny, and the mark is vector work.
  Otherwise **PNG with a real alpha channel**.
- **Transparent background**, so the mark can sit on ivory, on white, on teal,
  and over photography.
- **Metadata stripped** before it enters a public repository.
- **Extension matching the actual bytes.**
- Sensible pixel dimensions if raster — 4419 px square is far larger than any
  web use needs.

Likely also needed later, but not yet: a favicon/app-icon set, and a variant
that holds up on dark or busy backgrounds if the primary mark does not.

## Verification on arrival

When the replacement lands it will be checked before use: real file format from
the magic bytes, dimensions, presence of an alpha channel, the colour values
against the locked palette (`#0497B2` teal and `#FEDE59` yellow — see
`docs/WWS_VISUAL_IDENTITY.md` §2), any remaining metadata, and the filename and
path. It will then be used exactly as supplied.

## What references it today

One place only: the design-system specimen at `/design-system`, section 01,
which sets Manrope against the wordmark. **No production UI depends on this
asset**, and none should until a committed replacement exists.

On a fresh clone, or on any deployment, that one specimen image will 404 until
the replacement is committed. This affects the internal review surface only.
