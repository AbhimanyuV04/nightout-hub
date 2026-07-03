import Link from "next/link";

// Styled "back" pill used in page headers (glass, nudging arrow) — matches the room nav.
export default function BackLink({ href = "/", label = "Home" }: { href?: string; label?: string }) {
  return (
    <Link href={href} className="pill group">
      <span aria-hidden className="transition-transform group-hover:-translate-x-0.5">
        ←
      </span>
      {label}
    </Link>
  );
}
