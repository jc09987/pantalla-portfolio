import { put, type BlobAccessType, type PutBlobResult } from "@vercel/blob";

let cachedAccess: BlobAccessType | null = null;

function isAccessMismatch(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return /private store|public access|public store|private access/i.test(message);
}

export async function putStoreBlob(
  pathname: string,
  body: File | Buffer,
  contentType: string,
): Promise<PutBlobResult> {
  const options = {
    addRandomSuffix: true,
    contentType,
  } as const;

  const attempts: BlobAccessType[] = cachedAccess
    ? [cachedAccess]
    : ["private", "public"];

  let lastError: unknown;
  for (const access of attempts) {
    try {
      const blob = await put(pathname, body, { ...options, access });
      cachedAccess = access;
      return blob;
    } catch (error) {
      lastError = error;
      if (!isAccessMismatch(error) || cachedAccess) throw error;
    }
  }
  throw lastError;
}
