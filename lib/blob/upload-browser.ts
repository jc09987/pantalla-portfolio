export async function uploadStoreMedia(file: Blob, filename: string) {
  const form = new FormData();
  form.set("file", file, filename);
  form.set("filename", filename);

  const response = await fetch("/api/blob/upload", {
    method: "POST",
    body: form,
  });
  const payload = (await response.json().catch(() => null)) as
    | { url?: string; pathname?: string; contentType?: string; error?: string }
    | null;
  if (!response.ok || !payload?.url || !payload.pathname) {
    throw new Error(payload?.error ?? "No se pudo subir el archivo.");
  }
  return {
    url: payload.url,
    pathname: payload.pathname,
    contentType: payload.contentType ?? file.type,
  };
}
