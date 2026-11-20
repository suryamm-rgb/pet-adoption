import Link from "next/link";
import { Logo } from "./site-header";

const cols = [
  { title: "Platform", links: [["Find caretakers", "/caretakers"], ["Adopt a pet", "/adopt"], ["Pets for sale", "/pets-for-sale"], ["Pet shop", "/shop"]] },
  { title: "Earn with us", links: [["Become a caretaker", "/register"], ["List a pet", "/seller/listings/new"]] },
  { title: "Legal", links: [["Terms", "/legal/terms"], ["Privacy", "/legal/privacy"], ["Refund policy", "/legal/refunds"], ["Care agreement", "/legal/care-agreement"]] },
];

export function SiteFooter() {
  return (
    <footer className="bg-brand-900 text-white">
      <div className="mx-auto grid max-w-page gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="[&_a]:text-white"><Logo /></div>
          <p className="mt-3 max-w-xs text-sm text-white/70">Verified caretakers. Safe payments. Daily photo updates until your pet is home.</p>
        </div>
        {cols.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <p className="text-sm font-semibold text-brand-300">{c.title}</p>
            <ul className="mt-3 space-y-2 text-sm text-white/75">
              {c.links.map(([label, href]) => (
                <li key={href}><Link href={href} className="hover:text-white hover:underline">{label}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/60">© 2026 PawStay. All rights reserved.</div>
    </footer>
  );
}
