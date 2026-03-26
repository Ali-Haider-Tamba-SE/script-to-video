"use client";

import { FormEvent, useMemo, useState } from "react";

import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_SCRIPT_LENGTH,
  MIN_SCRIPT_LENGTH,
} from "@/lib/generation-constraints";

type GenerateResponse = {
  videoUrl?: string;
  videoDataUrl?: string;
  error?: string;
};

function toMb(bytes: number): string {
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10}MB`;
}

export default function Home() {
  const [image, setImage] = useState<File | null>(null);
  const [script, setScript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const scriptLength = script.trim().length;
  const canSubmit = useMemo(() => {
    if (!image) return false;
    return scriptLength >= MIN_SCRIPT_LENGTH && scriptLength <= MAX_SCRIPT_LENGTH;
  }, [image, scriptLength]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setVideoSrc(null);

    if (!image) {
      setError("Please upload an image.");
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(image.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      setError("Image must be JPG, PNG, or WEBP.");
      return;
    }

    if (image.size > MAX_IMAGE_BYTES) {
      setError(`Image must be ${toMb(MAX_IMAGE_BYTES)} or smaller.`);
      return;
    }

    if (scriptLength < MIN_SCRIPT_LENGTH) {
      setError(`Script must be at least ${MIN_SCRIPT_LENGTH} characters.`);
      return;
    }

    if (scriptLength > MAX_SCRIPT_LENGTH) {
      setError(`Script must be ${MAX_SCRIPT_LENGTH} characters or fewer.`);
      return;
    }

    const formData = new FormData();
    formData.set("image", image);
    formData.set("script", script.trim());

    setIsLoading(true);

    try {
      const response = await fetch("/api/generate-video", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as GenerateResponse;

      if (!response.ok) {
        setError(data.error ?? "Video generation failed.");
        return;
      }

      const resultSrc = data.videoUrl ?? data.videoDataUrl;
      if (!resultSrc) {
        setError("Generation succeeded, but no video source was returned.");
        return;
      }

      setVideoSrc(resultSrc);
    } catch {
      setError("Could not reach the generation API.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 p-6 font-sans dark:bg-black">
      <main className="w-full max-w-3xl rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Image + Script to Video
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Upload one image and provide a script. We will generate a video using Seedance 1.5.
        </p>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="image" className="block text-sm font-medium">
              Image
            </label>
            <input
              id="image"
              type="file"
              accept={ALLOWED_IMAGE_TYPES.join(",")}
              onChange={(event) => setImage(event.target.files?.[0] ?? null)}
              className="block w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-zinc-900"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              JPG, PNG, or WEBP. Max size: {toMb(MAX_IMAGE_BYTES)}.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="script" className="block text-sm font-medium">
              Script
            </label>
            <textarea
              id="script"
              rows={7}
              value={script}
              onChange={(event) => setScript(event.target.value)}
              placeholder="Describe the scene, camera movement, and style..."
              className="block w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-zinc-900"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {scriptLength}/{MAX_SCRIPT_LENGTH} characters (minimum {MIN_SCRIPT_LENGTH}).
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading || !canSubmit}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-black px-4 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {isLoading ? "Generating..." : "Generate video"}
          </button>
        </form>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        ) : null}

        {videoSrc ? (
          <section className="mt-6 space-y-3">
            <h2 className="text-lg font-semibold">Generated video</h2>
            <video src={videoSrc} controls className="w-full rounded-xl border border-black/10 dark:border-white/10" />
            <a
              href={videoSrc}
              download="seedance-video.mp4"
              className="inline-flex h-10 items-center rounded-lg border border-black/10 px-3 text-sm font-medium dark:border-white/20"
            >
              Download video
            </a>
          </section>
        ) : null}
      </main>
    </div>
  );
}
