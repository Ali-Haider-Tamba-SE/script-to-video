## Seedance 1.5 Image + Script to Video

This app lets a user upload one image and a script, then generates a video using Seedance 1.5.

## Environment variables

Copy `.env.example` to `.env.local` and fill in your key:

```bash
cp .env.example .env.local
```

Use a KIE key in `KIE_API_KEY`. `SEEDANCE_API_KEY` and `ARK_API_KEY` are still supported as fallback aliases.

## Getting started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## API

- `POST /api/generate-video`
  - Accepts `multipart/form-data`
  - Required fields:
    - `image` (`image/jpeg`, `image/png`, `image/webp`, max 10MB)
    - `script` (10-2000 chars)
  - Returns JSON:
    - `{ "videoUrl": "..." }` when provider returns a URL
    - `{ "videoDataUrl": "data:video/...;base64,..." }` when provider returns binary/base64

## Notes

- The server uses Node.js runtime for the generation route.
- Video generation now uses KIE task APIs (`/api/v1/jobs/createTask` + `/api/v1/jobs/recordInfo`) and returns `videoUrl` on success.
- Default model is `bytedance/seedance-1.5-pro` on KIE.
