import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/lib/auth/auth-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FaceCapture, dataUrlToBlob } from "@/components/face-capture";
import { toast } from "sonner";
import { ShieldCheck, Loader2 } from "lucide-react";

const STAFF_ROLES: AppRole[] = ["admin", "superadmin", "invigilator", "institute"];
const STAFF_IDENTITY_PREFIX = "pariksha:staff-identity:v2";

/**
 * Blocks staff (admin/superadmin/invigilator/institute) from accessing their
 * dashboard until they capture a fresh sign-in photo for this session.
 * Re-prompts on every new sign-in (SIGNED_IN event clears the session marker).
 */
export function StaffSigninGate({ children }: { children: React.ReactNode }) {
  const { session, user, roles } = useAuth();
  const requires = roles.some((r) => STAFF_ROLES.includes(r));
  const signInStamp = user?.last_sign_in_at ?? session?.expires_at ?? "current";
  const sessionKey = user ? `${STAFF_IDENTITY_PREFIX}:${user.id}:${signInStamp}` : "";
  const [verified, setVerified] = useState(false);
  const [photo, setPhoto] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!requires) {
      setVerified(true);
      return;
    }
    setVerified(!!(sessionKey && sessionStorage.getItem(sessionKey)));
  }, [requires, sessionKey]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" && user) {
        const prefix = `${STAFF_IDENTITY_PREFIX}:${user.id}:`;
        Object.keys(sessionStorage).forEach((key) => {
          if (key.startsWith(prefix) || key.startsWith(`pariksha:signin-photo:${user.id}:`)) {
            sessionStorage.removeItem(key);
          }
        });
        setVerified(false);
        setPhoto("");
      }
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [user]);

  async function submit() {
    if (!user || !photo) return;
    setBusy(true);
    try {
      const role = roles.find((r) => STAFF_ROLES.includes(r))!;
      const path = `${user.id}/signins/${Date.now()}.jpg`;
      const blob = dataUrlToBlob(photo);
      const { error: upErr } = await supabase.storage
        .from("face-photos")
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("face-photos").getPublicUrl(path);
      const photo_url = pub.publicUrl;
      const { error: rowErr } = await supabase.from("staff_signin_photos").insert({
        user_id: user.id,
        role,
        photo_url,
        user_agent: navigator.userAgent,
      });
      if (rowErr) throw rowErr;
      sessionStorage.setItem(sessionKey, "1");
      setVerified(true);
      toast.success("Sign-in identity recorded");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to record sign-in photo");
    } finally {
      setBusy(false);
    }
  }

  if (!requires || verified) return <>{children}</>;

  return (
    <Dialog
      open
      onOpenChange={() => {
        /* mandatory — no dismiss */
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-w-[560px] gap-4 rounded-lg p-5 sm:p-8"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-3 text-left">
          <DialogTitle className="flex items-center gap-3 text-2xl font-bold tracking-tight">
            <ShieldCheck className="h-6 w-6 shrink-0 text-accent" />
            <span>Sign-in identity check</span>
          </DialogTitle>
          <DialogDescription className="text-base leading-relaxed text-muted-foreground">
            For audit and integrity, capture a live photo. Your photo and sign-in time are stored in
            the secure vault.
          </DialogDescription>
        </DialogHeader>
        <FaceCapture onCapture={setPhoto} className="staff-identity-capture" autoStart />
        <Button
          onClick={submit}
          disabled={!photo || busy}
          className="h-12 w-full text-base font-semibold"
        >
          {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Continue to dashboard
        </Button>
      </DialogContent>
    </Dialog>
  );
}
