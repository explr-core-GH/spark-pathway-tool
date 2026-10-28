import { useEffect, useState } from "react";
import { signedFileUrl } from "./storage.functions";
import { storagePath, type PrivateBucket } from "./storage-paths";

/** Resolve a stored private-bucket value (path or legacy public URL) to a signed URL. */
export function useSignedFileUrl(bucket: PrivateBucket, value: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const path = storagePath(bucket, value);
    if (!path) {
      setUrl(null);
      return;
    }
    let live = true;
    signedFileUrl({ data: { bucket, path } })
      .then((r) => live && setUrl(r.url))
      .catch(() => live && setUrl(null));
    return () => {
      live = false;
    };
  }, [bucket, value]);
  return url;
}
