import logo from "@/assets/pariksha-logo.png.asset.json";

export function ParikshaLogo({ className = "h-9 w-9", showText = false }: { className?: string; showText?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <img src={logo.url} alt="Pariksha logo" className={`${className} object-contain`} />
      {showText && <span className="font-bold tracking-tight">Pariksha</span>}
    </span>
  );
}
