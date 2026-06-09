import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, CheckCircle2, Loader2, Clock } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onProceed: () => void;
  adminConfirmed: boolean;
  superadminConfirmed: boolean;
  bothConfirmed: boolean;
  secondsLeft: number;
  active: boolean;
  onStart: () => void;
}

export function LockCeremonyWitnessModal({
  open, onClose, onProceed,
  adminConfirmed, superadminConfirmed, bothConfirmed,
  secondsLeft, active, onStart,
}: Props) {
  const timedOut = !active && !bothConfirmed && secondsLeft === 0;
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-accent" /> 3-Way Witness Ceremony
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Locking a paper requires live witness confirmation from both an Admin and a SuperAdmin currently on the TriShield LiveWatch session.
          </p>

          <div className="space-y-2">
            <PartyRow label="Admin" confirmed={adminConfirmed} active={active} />
            <PartyRow label="SuperAdmin" confirmed={superadminConfirmed} active={active} />
          </div>

          {active && !bothConfirmed && (
            <div className="flex items-center gap-2 text-sm font-medium text-warning bg-warning/10 rounded-md px-3 py-2">
              <Clock className="h-4 w-4" /> Awaiting confirmations · {secondsLeft}s remaining
            </div>
          )}
          {timedOut && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              Ceremony timed out. Please re-request witness confirmation.
            </div>
          )}
          {bothConfirmed && (
            <div className="text-sm text-success bg-success/10 rounded-md px-3 py-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Both witnesses confirmed. You may proceed to authenticate.
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          {!active && !bothConfirmed && (
            <Button onClick={onStart}>Request witness confirmation</Button>
          )}
          {bothConfirmed && (
            <Button onClick={onProceed}>Proceed to lock</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PartyRow({ label, confirmed, active }: { label: string; confirmed: boolean; active: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
      <span className="text-sm font-medium">{label}</span>
      {confirmed ? (
        <span className="flex items-center gap-1.5 text-success text-sm font-semibold">
          <CheckCircle2 className="h-4 w-4" /> Confirmed
        </span>
      ) : active ? (
        <span className="flex items-center gap-1.5 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Waiting…
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">Idle</span>
      )}
    </div>
  );
}
