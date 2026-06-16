import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/lib/auth/auth-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FaceCapture, dataUrlToBlob } from "@/components/face-capture";
import { toast } from "sonner";
import { ShieldCheck, Loader2 } from "lucide-react";

const STAFF_ROLES: AppRole[] = ["admin", "superadmin", "invigilator"];

/**
 * Blocks staff (admin/superadmin/invigilator) from accessing their dashboard
 * until they capture a fresh sign-in photo for this session.
 * The capture is uploaded to face-photos/signins/<user>/<ts>.jpg and a row
 * is inserted in public.staff_signin_photos with the timestamp.
 */
export function StaffSigninGate({ children }: { children: React.ReactNode }) {
  const { user, roles } = useAuth();
  const requires = roles.some((r) => STAFF_ROLES.includes(r));
  const sessionKey = user ? `pariksha:signin-photo:${user.id}` : "";
  const [verified, setVerified] = useState(false);
  const [photo, setPhoto] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!requires) { setVerified(true); return; }
    if (sessionKey && sessionStorage.getItem(sessionKey)) setVerified(true);
  }, [requires, sessionKey]);

  async function submit() {
    if (!user || !photo) return;
    setBusy(true);
    try {
      const role = roles.find((r) => STAFF_ROLES.includes(r))!;
      const path = `${user.id}/signins/${Date.now()}.jpg`;
      const blob = dataUrlToBlob(photo);
      const { error: upErr } = await supabase.storage.from("face-photos").upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("face-photos").getPublicUrl(path);
      const photo_url = pub.publicUrl;
      const { error: rowErr } = await supabase.from("staff_signin_photos").insert({
        user_id: user.id, role, photo_url, user_agent: navigator.userAgent,
      });
      if (rowErr) throw rowErr;
      sessionStorage.setItem(sessionKey, "1");
      setVerified(true);
      toast.success("Sign-in identity recorded");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to record sign-in photo");
    } finally {
      setBusy(false);
    }
  }

  if (!requires || verified) return <>{children}</>;

  return (
    <Dialog open onOpenChange={() => { /* required — no dismiss */ }}>
      <DialogContent
        className="max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-accent" /> Sign-in identity check (required)
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Staff dashboards require a live photo per session. Your photo and sign-in time are stored in the secure audit vault.
        </p>
        <FaceCapture onCapture={setPhoto} />
        <Button onClick={submit} disabled={!photo || busy} className="w-full">
          {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Verify & continue
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => { await supabase.auth.signOut(); window.location.assign("/login"); }}
          className="w-full text-muted-foreground"
        >
          Sign out instead
        </Button>
      </DialogContent>
    </Dialog>
  );
}
