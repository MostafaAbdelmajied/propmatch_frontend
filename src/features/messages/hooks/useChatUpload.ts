"use client";

import { useState } from "react";
import { api } from "@/src/lib/api/browserClient";
import type { UploadedAttachment } from "@/src/lib/api/contracts/message";

/** Backend origin where /public assets are served (same host as the socket). */
const MEDIA_ORIGIN = process.env.NEXT_PUBLIC_SOCKET_URL ?? "";

/** Turn a stored relative path (/public/...) into an absolute, browser-loadable URL. */
export function mediaUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  return `${MEDIA_ORIGIN}${path}`;
}

/** Uploads a single chat attachment (image / video / voice note). */
export function useChatUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(
    file: Blob,
    fileName: string,
  ): Promise<UploadedAttachment | null> {
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file, fileName);
      return await api.postForm<UploadedAttachment>("uploads/chat", form);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر رفع الملف");
      return null;
    } finally {
      setUploading(false);
    }
  }

  return { upload, uploading, error };
}
