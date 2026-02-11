# Native ZIP builder (C)

Builds a ZIP archive from streamed stdin for **huge inputs**. Processes one entry at a time to keep memory bounded.

## Input format (from Node)

- Line 1: path (e.g. `SKILL.md`)
- Line 2: size in bytes (decimal)
- Raw: exactly `size` bytes of content
- Repeat. End with a line containing exactly `DONE`.

## Build

Requires [libzip](https://libzip.org/):

- macOS: `brew install libzip`
- Ubuntu/Debian: `sudo apt install libzip-dev`

Then:

```bash
make
```

Binary: `zip_from_stdin`. Writes the ZIP to stdout.

## Usage from Node

The skills-engine uses this when total content size exceeds the threshold (default 512KB). Pipe the same format to stdin and read the ZIP from stdout.
