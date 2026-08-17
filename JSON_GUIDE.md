# Comprehensive Guide to Writing JSON for Genius Song Credits & Metadata Import

This document is a comprehensive guide on how to structure, write, and import JSON for song credits, performer roles, tags, relationships, and metadata into Genius using the **Artwork Extractor for Genius** extension.

---

## Table of Contents
1. [Overview & Features](#1-overview--features)
2. [Single Song Page: Advanced JSON Editor](#2-single-song-page-advanced-json-editor)
   - [How to Access](#how-to-access)
   - [Modal Functions: Load Current & Save](#modal-functions-load-current--save)
   - [Single Song JSON Schema & Data Dictionary](#single-song-json-schema--data-dictionary)
   - [Auto-Cleaning & Auto-Resolution](#auto-cleaning--auto-resolution)
   - [Single Song Concrete JSON Examples](#single-song-concrete-json-examples)
3. [Album Page: Advanced Credits (Batch JSON Import)](#3-album-page-advanced-credits-batch-json-import)
   - [JSON Schema Options](#json-schema-options)
   - [Track Identification Rules](#track-identification-rules)
   - [Main Credit & Custom Role Fields](#main-credit--custom-role-fields)
   - [Album Batch Concrete JSON Examples](#album-batch-concrete-json-examples)
4. [Developer API Reference & Request Lifecycle](#4-developer-api-reference--request-lifecycle)
   - [Endpoints & CSRF Authentication](#endpoints--csrf-authentication)
   - [Autocomplete Helper Endpoints](#autocomplete-helper-endpoints)
   - [PUT /api/songs/{song_id} Request Lifecycle](#put-apisongssong_id-request-lifecycle)
5. [Common Pitfalls & Best Practices](#5-common-pitfalls--best-practices)

---

## 1. Overview & Features

The **Artwork Extractor for Genius** extension provides two distinct ways to view, edit, and import metadata using JSON:

1. **Single Song Page Advanced JSON Editor:** An interactive overlay modal on individual song pages that allows users and developers to inspect, edit, resolve, and save raw song JSON directly to Genius.
2. **Album Page Batch Credits Importer:** A tab within the Album Credits tool that allows mass-editing or track-by-track importing of credits across an entire album tracklist using structured JSON.

Both tools automatically validate input, resolve plain text strings (artist names, custom performance roles, genre tags) into official Genius database IDs via search APIs, and clean invalid URLs (such as YouTube playlist parameters) before sending updates to Genius.

---

## 2. Single Song Page: Advanced JSON Editor

### How to Access
1. Navigate to any Genius song page (e.g., `https://genius.com/Artist-song-title-lyrics`).
2. Ensure the setting **Advanced JSON Button** is enabled in the extension settings panel (under *Genius Song Page*).
3. In the action bar next to "Edit Metadata", click the **Advanced JSON** button. An overlay modal titled **Edit Metadata (JSON Payload)** will appear.

### Modal Functions: Load Current & Save
- **Load Current:** Click this button in the modal header to fetch fresh live metadata from Genius (`GET /api/songs/{song_id}`) and populate the textarea with a formatted, clean JSON template.
- **Save to Genius:** Click this button to process your JSON payload. The extension will:
  1. Parse and validate the JSON format.
  2. Clean YouTube URLs (stripping playlist parameters like `&list=`, `&index=`, `&pp=`).
  3. Query-resolve any artist names, custom role labels, or tag names that are passed as plain text or string values.
  4. Send the updated payload to Genius via `PUT /api/songs/{song_id}` with proper `X-CSRF-Token` headers.
  5. Reload the page upon success to show updated metadata and player buttons.

### Single Song JSON Schema & Data Dictionary

The single song editor expects a JSON object matching or subsetting the Genius API song payload:

| Key Name | Data Type | Description & Validation Rules |
| :--- | :--- | :--- |
| `primary_tag_id` | `integer` or `null` | Numeric ID of the primary tag/genre (e.g. `16` for Pop, `352` for R&B, `1434` for Rap, `567` for Rock). |
| `featured_artists` | `Array<ArtistRef>` | Array of featured performing artists. Can be an array of strings (`["Artist Name"]`) or objects (`[{"id": 123, "name": "Artist"}]`). |
| `writer_artists` | `Array<ArtistRef>` | Array of songwriters and composers. Accepts strings or objects with IDs. |
| `producer_artists` | `Array<ArtistRef>` | Array of music producers. Accepts strings or objects with IDs. |
| `custom_performances` | `Array<CustomCredit>` | Array of additional roles (e.g. `[{"label": "Distributor", "artists": ["Name"]}]`). `role` can be used as an alias for `label`. |
| `tags` | `Array<TagRef>` | Array of secondary tags. Accepts plain strings (e.g. `["Halloween"]`) or objects (e.g. `[{"id": 1882, "name": "Halloween"}]`). |
| `language` | `string` or `null` | ISO 639-1 two-letter language code (e.g., `"en"`, `"es"`, `"fr"`, `"de"`, `"ja"`). |
| `youtube_url` | `string` (URL) | Direct YouTube video URL (e.g. `https://www.youtube.com/watch?v=kJh_Eu4qfdQ`). Extra playlist params are auto-stripped. |
| `youtube_start` | `string` or `integer` | Start offset in seconds (e.g. `"21"` or `21`). |
| `soundcloud_url` | `string` (URL) | Direct SoundCloud track URL. |
| `release_date_components` | `object` or `null` | Split date object: `{"year": 2026, "month": 5, "day": 6}`. |

*Artist Ref Object Schema:*
```json
{
  "id": 4465543,
  "name": "Artist Name",
  "secondary": null,
  "secondaryPrefix": "a.k.a"
}
```

### Auto-Cleaning & Auto-Resolution

#### 1. YouTube URL Sanitization
Genius API rejects YouTube URLs containing playlist parameter strings (`&list=...`, `&index=...`, `&pp=...`). The extension automatically strips these parameter blocks and converts `youtu.be/` shortlinks into canonical `https://www.youtube.com/watch?v={id}` format.

#### 2. Artist, Custom Role, and Tag Query Resolution
You do not need to look up numeric Genius IDs manually. You can pass plain text strings:
- String artist names (`"CKay"`, `"Mavo"`) are automatically searched against `/api/artists/autocomplete?q={query}`.
- String custom role names (`"Distributor"`, `"Synthesizer"`) are searched against `/api/custom_performance_roles/autocomplete?q={query}`.
- String tag names (`"Halloween"`, `"Pop"`) are searched against `/api/tags/autocomplete?q={query}`.

### Single Song Concrete JSON Examples

#### Example 1: Full Metadata Payload (With Resolved IDs)
```json
{
  "primary_tag_id": 352,
  "featured_artists": [
    {
      "id": 4465543,
      "name": "Mavo",
      "secondary": null,
      "secondaryPrefix": "a.k.a"
    }
  ],
  "writer_artists": [
    {
      "id": 821992,
      "name": "CKay",
      "secondary": null,
      "secondaryPrefix": "a.k.a"
    }
  ],
  "producer_artists": [
    {
      "id": 359767,
      "name": "Hello",
      "secondary": null,
      "secondaryPrefix": "a.k.a"
    }
  ],
  "custom_performances": [
    {
      "label": "Distributor",
      "artists": [
        {
          "id": 208317,
          "name": "Hi",
          "secondary": null,
          "secondaryPrefix": "a.k.a"
        }
      ]
    }
  ],
  "tags": [
    {
      "id": 16,
      "name": "Pop"
    },
    {
      "id": 1882,
      "name": "Halloween"
    }
  ],
  "language": "es",
  "youtube_url": "https://www.youtube.com/watch?v=kJh_Eu4qfdQ",
  "youtube_start": "21",
  "soundcloud_url": "https://soundcloud.com/s0rrowmusic/unhappy",
  "release_date_components": {
    "year": 2026,
    "month": 5,
    "day": 6
  }
}
```

#### Example 2: Minimal String-Based Payload (Auto-Resolved by Extension)
You can write simple string names instead of complex objects:
```json
{
  "featured_artists": ["Mavo"],
  "writer_artists": ["CKay"],
  "producer_artists": ["Hello"],
  "custom_performances": [
    {
      "label": "Distributor",
      "artists": ["Hi"]
    },
    {
      "role": "Mixing Engineer",
      "artists": ["Mix Master"]
    }
  ],
  "tags": ["Pop", "Halloween"],
  "language": "en",
  "youtube_url": "https://www.youtube.com/watch?v=kJh_Eu4qfdQ&list=OLAK5uy_nXJPYxCG9FRU9Q-zGO8&index=1",
  "release_date_components": {
    "year": 2024,
    "month": 10,
    "day": 31
  }
}
```

---

## 3. Album Page: Advanced Credits (Batch JSON Import)

The album-level **Song Credits** modal allows mass-updating metadata across multiple album tracks at once using structured JSON.

### JSON Schema Options

The album JSON parser accepts three root structures:

#### Schema 1: Object with `tracks` array (Recommended)
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

#### Schema 2: Direct Array of Track Objects
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

#### Schema 3: Object with `tracks` Map/Dictionary
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

### Track Identification Rules
When matching track objects in JSON to songs on an album page, the extension checks fields in this order:
1. `track`: Track number (string or integer, e.g. `1`, `"01"`).
2. `track_number`: Alternative track number field.
3. `number`: Alternative track number field.
4. `song_id`: Genius Song ID (e.g. `14082258`).

### Main Credit & Custom Role Fields
- Main credits: `primary_artists`, `featured_artists`, `producers`, `writers`, `tags`.
- Custom performance credits: `additional_credits`, `custom_performances`, or `credits`.

### Album Batch Concrete JSON Examples

#### Example: Track-Specific Custom Credits
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
      "writers": ["Guitarist Name"],
      "additional_credits": [
        { "role": "Bass Guitar", "artists": ["Bassist Name"] }
      ]
    }
  ]
}
```

---

## 4. Developer API Reference & Request Lifecycle

This section details the underlying HTTP network lifecycle for developers building custom extensions or scripts that interface with Genius APIs.

### Endpoints & CSRF Authentication
All Genius metadata write operations require session cookies and an `X-CSRF-Token` header extracted from the page document:

```javascript
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
```

Request URL: `PUT https://genius.com/api/songs/{song_id}`
Request Headers:
```http
Content-Type: application/json
Accept: application/json, text/plain, */*
X-CSRF-Token: <CSRF_TOKEN>
```

### Autocomplete Helper Endpoints

| Resource | Endpoint | Query Parameters |
| :--- | :--- | :--- |
| Artist Autocomplete | `GET /api/artists/autocomplete` | `q={query}&text_format=html,markdown,preview` |
| Tag Autocomplete | `GET /api/tags/autocomplete` | `q={query}&text_format=html,markdown,preview` |
| Role Autocomplete | `GET /api/custom_performance_roles/autocomplete` | `q={query}&limit=20&type=performance` |

### PUT /api/songs/{song_id} Request Lifecycle

```
+----------------------------------------------------------------------------------------------------+
|                                      GENIUS METADATA EDIT FLOW                                     |
+----------------------------------------------------------------------------------------------------+
| [UI] Click "Advanced JSON" -> GET /api/songs/{song_id} (Fetch Current Live State)                  |
|                                                                                                    |
| [UI] User pastes/edits JSON payload                                                                |
|                                                                                                    |
| [Extension] Resolve Strings -> GET /api/artists/autocomplete?q=Mavo  -> ID 4465543                 |
|                             -> GET /api/artists/autocomplete?q=CKay  -> ID 821992                  |
|                             -> GET /api/custom_performance_roles/autocomplete?q=distri -> ID 1268 |
|                             -> GET /api/tags/autocomplete?q=halloween -> ID 1882                  |
|                                                                                                    |
| [Extension] Clean YouTube URL -> Strips playlist params (&list=, &index=, etc.)                    |
|                                                                                                    |
| [Extension] Save -> PUT /api/songs/{song_id} (Sends structured JSON payload)                       |
|                  -> Page reload to reflect changes                                                 |
+----------------------------------------------------------------------------------------------------+
```

---

## 5. Common Pitfalls & Best Practices

1. **YouTube URL Formatting:** Always provide clean video links. If extra playlist parameters exist, the extension cleans them automatically, but manual links should adhere to `https://www.youtube.com/watch?v=VIDEO_ID`.
2. **Tag Numeric IDs:** Plain genre tags require numeric IDs when submitted to Genius. Leaving string tags unresolved can lead to API errors; always allow the extension to resolve them or pass numeric tag ID objects (e.g. `{"id": 16, "name": "Pop"}`).
3. **Valid JSON Syntax:** Ensure brackets, braces, and quotes are closed correctly.
4. **Track Matching in Album Mode:** Ensure `track` numbers in your JSON match the track numbers on the album page DOM.
