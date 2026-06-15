import { Link } from "@tanstack/react-router";
import { Leaf } from "lucide-react";

export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/"
      className={`inline-flex items-center gap-2 font-semibold text-foreground ${className}`}
    >
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Leaf className="h-5 w-5" />
      </span>
      <span className="text-lg tracking-tight">FarmHelper</span>
    </Link>
  );
}
