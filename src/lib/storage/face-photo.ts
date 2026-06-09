import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Extract the object path inside the face-photos bucket from any stored URL. */
export function extractFacePhotoPath(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/\/face-photos\/(.+?)(?:\?|$)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/** Sign a face-photos URL/path for the signed-in user. Returns a displayable URL or null. */
export async function signFacePhotoUrl(url: string | null | undefined, expiresIn = 3600): Promise<string | null> {
  const path = extractFacePhotoPath(url);
  if (!path) return null;
  const { data, error } = await supabase.storage.from("face-photos").createSignedUrl(path, expiresIn);
  if (error || !data) return null;
  return data.signedUrl;
}

/** React hook: turn a stored face-photos URL into a freshly-signed displayable URL. */
export function useSignedFacePhoto(url: string | null | undefined): string | null {
  const [signed, setSigned] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setSigned(null);
    if (!url) return;
    // data: URLs (e.g. fresh capture preview) and non-bucket URLs pass through unchanged
    if (!/\/face-photos\//.test(url)) { setSigned(url); return; }
    signFacePhotoUrl(url).then((u) => { if (active) setSigned(u); });
    return () => { active = false; };
  }, [url]);
  return signed;
}
