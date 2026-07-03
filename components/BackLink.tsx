import Link from "next/link";

// Styled "back" pill used in page headers (glass, nudging arrow) — matches the room nav.
export default function BackLink({ href = "/", label = "Home" }: { href?: string; label?: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-[#8E8E93] backdrop-blur-md transition hover:text-white active:scale-95"
    >
      <span aria-hidden className="transition-transform group-hover:-translate-x-0.5">
        ←
      </span>
      {label}
    </Link>
  );
}
