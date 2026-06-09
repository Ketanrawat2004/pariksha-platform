import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CameraRequiredBlock({ onRetry, scope = "fullscreen" }: { onRetry: () => void; scope?: "fullscreen" | "inline" }) {
  const wrap =
    scope === "fullscreen"
      ? "fixed inset-0 z-[9999] bg-background/95 backdrop-blur flex items-center justify-center p-6"
      : "rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center";
  return (
    <div className={wrap}>
      <div className="max-w-md text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
        <h2 className="mt-4 text-xl font-bold">Camera access is mandatory</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          TriShield LiveWatch requires your camera for compliance. You cannot access this area without enabling your camera.
        </p>
        <Button onClick={onRetry} className="mt-5">Try again</Button>
      </div>
    </div>
  );
}
