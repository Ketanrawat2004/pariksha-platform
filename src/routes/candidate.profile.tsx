import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ProtectedShell } from "@/components/protected-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FaceCapture, dataUrlToBlob } from "@/components/face-capture";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { useSignedFacePhoto } from "@/lib/storage/face-photo";
import { Loader2, Save, UserCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/candidate/profile")({
  head: () => ({ meta: [{ title: "Profile — Pariksha" }] }),
  component: () => (
    <ProtectedShell requireRoles={["candidate"]}>
      <ProfileEditor />
    </ProtectedShell>
  ),
});

const DEMO_PHOTO_KEY = "pariksha:demo-profile-photo";

function ProfileEditor() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [state, setState] = useState("");
  const [livePhoto, setLivePhoto] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile-full", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email, phone, date_of_birth, gender, state, photo_url")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
      setDob(profile.date_of_birth ?? "");
      setGender(profile.gender ?? "");
      setState(profile.state ?? "");
    }
  }, [profile]);

  const signedPhoto = useSignedFacePhoto(profile?.photo_url);

  async function save() {
    if (!user) return;
    setBusy(true);
    try {
      let photo_url = profile?.photo_url ?? null;
      if (livePhoto) {
        const path = `${user.id}/profile/${Date.now()}.jpg`;
        const blob = dataUrlToBlob(livePhoto);
        const { error: upErr } = await supabase.storage
          .from("face-photos")
          .upload(path, blob, { contentType: "image/jpeg", upsert: true });
        if (upErr) throw upErr;
        photo_url = supabase.storage.from("face-photos").getPublicUrl(path).data.publicUrl;
        // Stash the actual base64 capture so the anonymous /give-exam demo
        // flow can match against it without needing storage access.
        try { localStorage.setItem(DEMO_PHOTO_KEY, livePhoto); } catch {}
      }
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: phone || null,
          date_of_birth: dob || null,
          gender: gender || null,
          state: state || null,
          photo_url,
        })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["profile-full", user.id] });
      qc.invalidateQueries({ queryKey: ["profile", user.id] });
      setLivePhoto("");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save profile");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Your profile</h1>
        <p className="text-muted-foreground mt-1">Your photo and details are used for admit-card verification and face-match at exam entry.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 flex flex-col items-center text-center lg:col-span-1">
          {signedPhoto ? (
            <img src={signedPhoto} alt={profile?.full_name ?? "You"} className="h-32 w-32 rounded-full object-cover border-4 border-accent shadow-elegant" />
          ) : (
            <div className="h-32 w-32 rounded-full bg-muted flex items-center justify-center">
              <UserCircle2 className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
          <h2 className="font-bold text-lg mt-4">{profile?.full_name ?? "—"}</h2>
          <p className="text-sm text-muted-foreground">{profile?.email}</p>
          {profile?.phone && <p className="text-sm text-muted-foreground mt-1">{profile.phone}</p>}
          {profile?.date_of_birth && <p className="text-xs text-muted-foreground mt-1">DOB: {profile.date_of_birth}</p>}
          {signedPhoto && (
            <div className="mt-3 inline-flex items-center gap-1 text-xs text-success">
              <ShieldCheck className="h-3 w-3" /> Reference photo on file
            </div>
          )}
        </Card>

        <Card className="p-6 lg:col-span-2 space-y-5">
          <div>
            <Label>Capture live profile photo</Label>
            <p className="text-xs text-muted-foreground mb-2">This is the photo we'll match against your live capture on the Give Exam page.</p>
            <FaceCapture onCapture={setLivePhoto} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="fn">Full name</Label>
              <Input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ph">Phone</Label>
              <Input id="ph" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="dob">Date of birth</Label>
              <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="g">Gender</Label>
              <Input id="g" value={gender} onChange={(e) => setGender(e.target.value)} placeholder="Female / Male / Other" />
            </div>
            <div>
              <Label htmlFor="st">State</Label>
              <Input id="st" value={state} onChange={(e) => setState(e.target.value)} />
            </div>
          </div>

          <Button onClick={save} disabled={busy} className="w-full sm:w-auto">
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save profile
          </Button>
        </Card>
      </div>
    </div>
  );
}
