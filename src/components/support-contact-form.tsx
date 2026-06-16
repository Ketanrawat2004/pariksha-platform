import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, CheckCircle2, LifeBuoy, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitSupportTicket } from "@/lib/support/support.functions";

const schema = z.object({
  name: z.string().trim().min(1, "Required").max(120),
  email: z.string().trim().email("Invalid email").max(254),
  subject: z.string().trim().min(3, "Min 3 characters").max(200),
  message: z.string().trim().min(10, "Min 10 characters").max(4000),
});
type FormData = z.infer<typeof schema>;

export function SupportContactForm() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [caseRef, setCaseRef] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const res = await submitSupportTicket({ data });
      setCaseRef(res.case_ref);
      reset();
      toast.success(`Ticket received — ${res.case_ref}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (caseRef) {
    return (
      <div className="max-w-md rounded-xl border border-white/10 bg-white/5 backdrop-blur p-4 text-sm space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-accent" />
          <span className="font-semibold">Ticket received</span>
        </div>
        <p className="text-primary-foreground/75 text-xs">
          Save this case reference. Our team replies within 1 business hour on exam days.
        </p>
        <p className="text-primary-foreground/70 text-[11px] leading-snug">
          📩 The admin's reply will appear in your <span className="font-semibold text-accent">Candidate → Notifications</span> page once you sign in.
        </p>
        <div className="flex items-center gap-2 rounded-lg bg-black/30 px-3 py-2 font-mono text-sm">
          <span className="flex-1 truncate">{caseRef}</span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(caseRef);
              toast.success("Copied");
            }}
            className="rounded p-1 hover:bg-white/10"
            aria-label="Copy case reference"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            setCaseRef(null);
            setOpen(false);
          }}
          className="text-xs text-accent hover:underline"
        >
          Submit another
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="max-w-md rounded-xl border border-white/10 bg-white/5 backdrop-blur p-4 text-sm">
        <div className="font-semibold mb-1 flex items-center gap-2">
          <LifeBuoy className="h-4 w-4" /> Need help signing in?
        </div>
        <p className="text-primary-foreground/75 text-xs mb-3">
          Our support desk responds within 1 business hour on exam days.
        </p>
        <div className="flex flex-wrap gap-2 text-xs items-center">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 px-3 py-1.5 font-medium"
          >
            Open support form
          </button>
          <a href="mailto:support@pariksha.in" className="rounded-full bg-white/10 hover:bg-white/15 px-3 py-1.5">
            ✉ support@pariksha.in
          </a>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-md rounded-xl border border-white/10 bg-white/5 backdrop-blur p-4 text-sm space-y-3"
      noValidate
    >
      <div className="font-semibold flex items-center gap-2">
        <LifeBuoy className="h-4 w-4" /> Contact support
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Input placeholder="Name" {...register("name")} className="bg-white/10 border-white/20 placeholder:text-primary-foreground/50 text-primary-foreground" />
          {errors.name && <p className="text-[10px] text-destructive mt-0.5">{errors.name.message}</p>}
        </div>
        <div>
          <Input placeholder="Email" type="email" {...register("email")} className="bg-white/10 border-white/20 placeholder:text-primary-foreground/50 text-primary-foreground" />
          {errors.email && <p className="text-[10px] text-destructive mt-0.5">{errors.email.message}</p>}
        </div>
      </div>
      <div>
        <Input placeholder="Subject" {...register("subject")} className="bg-white/10 border-white/20 placeholder:text-primary-foreground/50 text-primary-foreground" />
        {errors.subject && <p className="text-[10px] text-destructive mt-0.5">{errors.subject.message}</p>}
      </div>
      <div>
        <Textarea
          placeholder="How can we help? Include exam ID if relevant."
          rows={3}
          {...register("message")}
          className="bg-white/10 border-white/20 placeholder:text-primary-foreground/50 text-primary-foreground"
        />
        {errors.message && <p className="text-[10px] text-destructive mt-0.5">{errors.message.message}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={submitting} className="bg-accent text-accent-foreground hover:bg-accent/90">
          {submitting && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
          Send
        </Button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-primary-foreground/70 hover:text-primary-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
