# Comprehensive Guide to Writing JSON for Song Credits & Metadata Import

This document is a comprehensive guide on how to structure and write JSON inputs for importing song credits, performer roles, tags, relationships, and metadata into Genius using the **Artwork Extractor for Genius** extension.

---

## Table of Contents
1. [Overview & Core Concepts](#1-overview--core-concepts)
2. [JSON Structure & Schema Options](#2-json-structure--schema-options)
3. [Track Identification Rules](#3-track-identification-rules)
4. [Main Credit Fields](#4-main-credit-fields)
5. [Additional Performance Credits (Custom Roles)](#5-additional-performance-credits-custom-roles)
6. [Supported Data Types & Resolution](#6-supported-data-types--resolution)
7. [Concrete JSON Examples](#7-concrete-json-examples)
   - [Example A: Edit a Single Track (e.g., Track 1 Only)](#example-a-edit-a-single-track-eg-track-1-only)
   - [Example B: Album-Wide Mass Edit (Same Credits for All Tracks)](#example-b-album-wide-mass-edit-same-credits-for-all-tracks)
   - [Example C: Multi-Track Specific Credits](#example-c-multi-track-specific-credits)
   - [Example D: Full Tracklist Import with Custom Roles](#example-d-full-tracklist-import-with-custom-roles)
8. [Common Pitfalls & Best Practices](#8-common-pitfalls--best-practices)

---

## 1. Overview & Core Concepts

The extension's **Advanced Credits (JSON Input)** tab allows you to quickly import credits for an entire album or specific individual tracks using structured JSON.

### Key Behaviors:
- **Single-Track / Track-Specific Edits:** If your JSON defines track-specific entries (via a `tracks` array or list), the extension automatically switches to individual track mode and checks **only** the specified tracks for main credit updates. Unspecified tracks remain untouched.
- **Album-Wide / Global Edits:** If you supply top-level fields (e.g. `primary_artists`, `producers`, `tags`) without track-level overrides, those credits apply across all selected tracks on the album.
- **Automatic Resolution:** Artist names, tag names, and custom performance roles are query-resolved against Genius search APIs automatically. You can pass simple string names or complete Genius objects with numeric IDs.

---

## 2. JSON Structure & Schema Options

The JSON parser accepts three main root-level structures:

### Schema 1: Object with `tracks` array (Recommended)
```json
{
  "primary_artists": ["Album Main Artist"],
  "tracks": [
    {
      "track": 1,
      "primary_artists": ["Track 1 Artist"],
      "additional_credits": [
        {
          "role": "Synthesizer",
          "artists": ["Musician Name"]
        }
      ]
    }
  ]
}
```

### Schema 2: Direct Array of Track Objects
```json
[
  {
    "track": 1,
    "primary_artists": ["Artist 1"],
    "producers": ["Producer A"]
  },
  {
    "track": 2,
    "primary_artists": ["Artist 2"],
    "writers": ["Writer B"]
  }
]
```

### Schema 3: Object with `tracks` Map/Dictionary
```json
{
  "tracks": {
    "1": {
      "featured_artists": ["Feature A"],
      "producers": ["Producer X"]
    },
    "2": {
      "featured_artists": ["Feature B"]
    }
  }
}
```

---

## 3. Track Identification Rules

When matching a track object in the JSON to a song on the Genius album page, the extension checks the following fields in priority order:

1. **`track`**: Track number (string or number, e.g. `1`, `"01"`, `"I"`).
2. **`track_number`**: Alternative track number field (e.g. `1`).
3. **`number`**: Alternative track number field (e.g. `1`).
4. **`song_id`**: Direct Genius Song ID (e.g. `14082258` or `"14082258"`).

If none of these fields are present, but the number of items in `tracks` matches the total number of songs on the album, tracks are matched sequentially by index (0-based).

---

## 4. Main Credit Fields

The following main credit fields can be specified either at the root level (album-wide) or inside individual track objects:

| Field Name | Description | Accepted Format |
| :--- | :--- | :--- |
| `primary_artists` | Primary performing artist(s) | Array of strings, IDs, or artist objects |
| `featured_artists` | Featured artist(s) | Array of strings, IDs, or artist objects |
| `producers` | Song producer(s) | Array of strings, IDs, or artist objects |
| `writers` | Songwriter(s) / Composers | Array of strings, IDs, or artist objects |
| `tags` | Genre / Secondary tags | Array of strings, IDs, or tag objects |

---

## 5. Additional Performance Credits (Custom Roles)

Additional performance credits (such as instruments, engineering, background vocals, mix/mastering engineers) can be added per track or globally.

### Supported Key Names for Additional Credits:
- `additional_credits`
- `custom_performances`
- `credits`

### Structure of an Additional Credit Item:
```json
{
  "role": "Electric Guitar",
  "artists": ["Guitarist Name"]
}
```
*Note: `label` can be used as an alias for `role`, and `artist` (single string/object) can be used as an alias for `artists`.*

---

## 6. Supported Data Types & Resolution

You can write values as plain text strings, numbers, or objects. The extension automatically resolves them into numeric Genius IDs:

### String Values (Auto-resolved via Genius API)
```json
{
  "primary_artists": ["Daft Punk"],
  "producers": ["Pharrell Williams"]
}
```

### Artist Objects with Numeric IDs
If you already know the Genius Artist ID, you can pass an object:
```json
{
  "primary_artists": [
    { "id": 4671817, "name": "infinitehoax" }
  ]
}
```

### Tag Objects with Numeric IDs
*Important:* Tags on Genius require numeric IDs to avoid 500 errors. The extension resolves strings to IDs automatically or accepts numeric ID objects:
```json
{
  "tags": [
    { "id": 16, "name": "Pop" }
  ]
}
```

---

## 7. Concrete JSON Examples

### Example A: Edit a Single Track (e.g., Track 1 Only)
To edit **only Track 1** without touching or modifying any other songs on the album:

```json
{
  "tracks": [
    {
      "track": 1,
      "primary_artists": ["infinitehoax", "Mavo"],
      "featured_artists": ["Guest Singer"],
      "producers": ["Producer One"],
      "writers": ["Writer One"],
      "tags": ["Pop", "Synthpop"],
      "additional_credits": [
        {
          "role": "Synthesizer",
          "artists": ["Key Player"]
        },
        {
          "role": "Mixing Engineer",
          "artists": ["Mix Master"]
        }
      ]
    }
  ]
}
```

### Example B: Album-Wide Mass Edit (Same Credits for All Tracks)
To set the same producers and tags across all tracks on the album:

```json
{
  "primary_artists": ["Main Artist"],
  "producers": ["Executive Producer"],
  "tags": ["Hip-Hop", "Rap"]
}
```

### Example C: Multi-Track Specific Credits
To set specific credits for Track 1 and Track 3 separately:

```json
{
  "tracks": [
    {
      "track": 1,
      "primary_artists": ["Artist A"],
      "featured_artists": ["Feature 1"],
      "additional_credits": [
        { "role": "Acoustic Guitar", "artists": ["Guitarist A"] }
      ]
    },
    {
      "track": 3,
      "primary_artists": ["Artist A"],
      "featured_artists": ["Feature 2"],
      "additional_credits": [
        { "role": "Saxophone", "artists": ["Sax Player"] }
      ]
    }
  ]
}
```

### Example D: Full Tracklist Import with Custom Roles
Importing a complete 4-track album tracklist with distinct roles per track:

```json
{
  "primary_artists": ["Band Name"],
  "tags": ["Rock"],
  "tracks": [
    {
      "track": 1,
      "writers": ["Singer Name"],
      "additional_credits": [
        { "role": "Lead Vocals", "artists": ["Singer Name"] },
        { "role": "Drums", "artists": ["Drummer Name"] }
      ]
    },
    {
      "track": 2,
      "writers": ["Guitarist Name", "Singer Name"],
      "additional_credits": [
        { "role": "Bass Guitar", "artists": ["Bassist Name"] }
      ]
    },
    {
      "track": 3,
      "featured_artists": ["Special Guest"],
      "additional_credits": [
        { "role": "Piano", "artists": ["Pianist Name"] }
      ]
    },
    {
      "track": 4,
      "producers": ["Co-Producer"],
      "additional_credits": [
        { "role": "Cellos", "artists": ["Cellist Name"] }
      ]
    }
  ]
}
```

---

## 8. Common Pitfalls & Best Practices

1. **Track Matching:** Make sure the `track` number in your JSON matches the track number displayed in the tracklist DOM (e.g. `1`, `2`, `3`).
2. **Valid JSON:** Ensure your input is valid JSON (valid quotes, commas, and balanced brackets/braces).
3. **Applying JSON:** Click the **Apply JSON** button on the "JSON Input" tab before clicking **Save**. You will see feedback indicating artist and tag resolution.
4. **Tag Numeric IDs:** Plain tag strings (e.g. `"Pop"`) are automatically resolved to their Genius numeric tag IDs (e.g. `16`) to prevent API errors.
