## Seedance 1.5 Image + Script to Video

This app lets a user upload one image and a script, then generates a video using Seedance 1.5.

## Environment variables

Copy `.env.example` to `.env.local` and fill in your key:

```bash
cp .env.example .env.local
```

Use a KIE key in `KIE_API_KEY`. `SEEDANCE_API_KEY` and `ARK_API_KEY` are still supported as fallback aliases.
Set Supabase server credentials too: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and optionally `SUPABASE_STORAGE_BUCKET` (default `uploads`, must be public).
For browser direct uploads, set: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Getting started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## API

- `POST /api/generate-video`
  - Accepts `application/json`
  - Required fields:
    - `imageUrl` (public http/https URL of uploaded image)
    - `script` (10-2000 chars)
  - Returns JSON:
    - `{ "videoUrl": "..." }` when provider returns a URL
    - `{ "videoDataUrl": "data:video/...;base64,..." }` when provider returns binary/base64

- `POST /api/create-image-upload`
  - Accepts `application/json`
  - Required fields:
    - `contentType` (`image/jpeg`, `image/png`, `image/webp`)
  - Returns signed upload target for direct browser-to-Supabase upload.

## Notes

- The server uses Node.js runtime for the generation route.
- Large image files do not pass through the API route anymore. The browser uploads directly to Supabase via signed upload URL, then sends `imageUrl` + `script` to the generation route.
- Video generation now uses KIE task APIs (`/api/v1/jobs/createTask` + `/api/v1/jobs/recordInfo`) and returns `videoUrl` on success.
- Uploaded image public URL is sent to KIE `input_urls`.
- Default model is `bytedance/seedance-1.5-pro` on KIE.
