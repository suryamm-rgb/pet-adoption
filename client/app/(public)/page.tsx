import Link from "next/link";
import { FeaturedCaretakers } from "@/components/features/featured-caretakers";
import { Faq } from "@/components/features/faq";
import { HeroSearch } from "@/components/features/hero-search";
import { ButtonLink } from "@/components/ui/button";
import { Photo } from "@/components/ui/photo";
import { photo } from "@/lib/images";

const tiles = [
  { href: "/caretakers?petType=Dog", title: "Dog care", sub: "Walks, play and cuddles", img: photo("golden", 600, 700) },
  { href: "/caretakers?petType=Cat", title: "Cat care", sub: "Calm homes for cats", img: photo("cat", 600, 700) },
  { href: "/adopt", title: "Adopt", sub: "Find a forever friend", img: photo("beagle", 600, 700) },
  { href: "/shop", title: "Pet shop", sub: "Food, toys and more", img: photo("food", 600, 700) },
];

const steps = [
  { n: "1", icon: "🔎", tone: "bg-brand-100 text-brand-700", ring: "border-brand-200", title: "Find a caretaker", text: "Search by city, dates and pet. Compare reviews, homes and daily prices." },
  { n: "2", icon: "🔒", tone: "bg-accent-100 text-accent-700", ring: "border-accent-200", title: "Book and pay safely", text: "Send a request. Once accepted, pay online. We hold the money until your pet is home." },
  { n: "3", icon: "📸", tone: "bg-sky-100 text-sky-600", ring: "border-sky-100", title: "Relax, get updates", text: "Daily photos and notes, chat any time, and an emergency button if anything is wrong." },
];

const featureTones = ["bg-brand-100", "bg-accent-100", "bg-sky-100", "bg-berry-100", "bg-sun-100", "bg-brand-100"];

const features = [
  ["🪪", "ID-verified caretakers", "Documents are checked by our team before anyone is listed."],
  ["🔒", "Payment held safely", "Money is released only after your pet is back and safe."],
  ["📸", "Daily photo updates", "See your pet's day, every day, from wherever you are."],
  ["🚨", "Emergency alerts", "One tap alerts you and our team with your vet's details."],
  ["💬", "Chat inside every booking", "Talk to your caretaker directly, with a record if anything is disputed."],
  ["↩️", "Fair refunds", "Clear cancellation tiers, and a full refund if a caretaker cancels."],
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-hero">
        <div className="mx-auto grid max-w-page items-center gap-10 px-4 pb-10 pt-10 sm:pt-14 lg:grid-cols-[1.05fr_1fr] lg:pb-16 lg:pt-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3 py-1 text-xs font-semibold text-primary backdrop-blur">
              <span className="size-1.5 rounded-full bg-success-600" aria-hidden /> Trusted pet care while you travel
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-6xl">
              Leave your pet with someone <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">who loves them</span> too.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Book verified caretakers by the day. Get daily photo updates, and pay safely: we release the money only when your pet is back home.
            </p>
            <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              {[["ID verified", "every caretaker"], ["Daily updates", "photo and note"], ["Safe payments", "held until return"]].map(([a, b]) => (
                <div key={a} className="flex items-center gap-2"><span className="flex size-6 items-center justify-center rounded-full bg-success-50 text-xs text-success-700" aria-hidden>✓</span><div><dt className="font-semibold leading-tight">{a}</dt><dd className="text-xs text-muted">{b}</dd></div></div>
              ))}
            </dl>
          </div>
          <div className="relative">
            <Photo src={photo("hero", 1000, 1000)} alt="Two happy dogs running at sunset" className="aspect-[5/4] w-full rounded-[2rem] shadow-pop lg:aspect-square" />
            <div className="absolute -bottom-4 left-4 hidden items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-pop sm:flex">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-lg" aria-hidden>📸</span>
              <div><p className="text-sm font-semibold">Day 2 update</p><p className="text-xs text-muted">Long walk, ate all his food</p></div>
            </div>
            <div className="absolute -top-3 right-4 hidden items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-sm font-semibold shadow-pop sm:flex"><span className="text-accent-500" aria-hidden>★</span> 4.9 rated caretakers</div>
          </div>
        </div>
        <div className="relative z-10 mx-auto max-w-page px-4 pb-12">
          <HeroSearch />
        </div>
      </section>

      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-page px-4 py-14">
        <div className="mb-8 max-w-xl">
          <h2 className="text-3xl font-semibold sm:text-4xl">Everything your pet needs</h2>
          <p className="mt-2 text-muted">From a weekend away to a forever home.</p>
        </div>
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {tiles.map((t) => (
            <li key={t.title}>
              <Link href={t.href} className="group relative block aspect-[4/5] overflow-hidden rounded-2xl">
                <Photo src={t.img} alt="" className="absolute inset-0 size-full transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" aria-hidden />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <p className="text-lg font-semibold">{t.title}</p>
                  <p className="text-sm text-white/80">{t.sub}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      </section>

      <section className="border-b border-border bg-surface-muted">
        <div className="mx-auto max-w-page px-4 py-14">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Simple and safe</p>
          <h2 className="text-3xl font-semibold sm:text-4xl">How PawStay works</h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <li key={s.n} className={`relative rounded-2xl border-2 bg-surface p-6 shadow-card ${s.ring}`}>
                <span className={`flex size-14 items-center justify-center rounded-2xl text-2xl ${s.tone}`} aria-hidden>{s.icon}</span>
                <span className="absolute right-5 top-5 text-5xl font-semibold text-border-strong/60" aria-hidden>{s.n}</span>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-page px-4 py-14">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div><h2 className="text-3xl font-semibold sm:text-4xl">Top-rated caretakers</h2><p className="mt-2 text-muted">Verified, reviewed and loved by pet owners.</p></div>
          <Link href="/caretakers" className="hidden text-sm font-semibold text-primary hover:underline sm:block">View all →</Link>
        </div>
        <FeaturedCaretakers />
        <Link href="/caretakers" className="mt-6 block text-center text-sm font-semibold text-primary hover:underline sm:hidden">View all caretakers →</Link>
      </div>
      </section>

      <section className="border-b border-border bg-surface-muted">
        <div className="mx-auto max-w-page px-4 py-14">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Photo src={photo("runner", 900, 700)} alt="A happy dog running on grass" className="aspect-[4/3] w-full rounded-3xl" />
          <div>
            <h2 className="text-3xl font-semibold sm:text-4xl">Peace of mind, built in</h2>
            <p className="mt-2 text-muted">Travelling is easier when you know your pet is looked after.</p>
            <ul className="mt-6 grid gap-5 sm:grid-cols-2">
              {features.map(([icon, title, text], i) => (
                <li key={title} className="flex gap-3">
                  <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-xl ${featureTones[i]}`} aria-hidden>{icon}</span>
                  <div><p className="font-semibold leading-tight">{title}</p><p className="mt-0.5 text-sm text-muted">{text}</p></div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      </section>

      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-3xl px-4 py-14">
        <h2 className="mb-6 text-center text-3xl font-semibold sm:text-4xl">Questions, answered</h2>
        <Faq />
      </div>
      </section>

      <section className="bg-brand-50">
        <div className="mx-auto max-w-page px-4 py-14">
        <div className="relative overflow-hidden rounded-3xl bg-brand-gradient text-white shadow-glow">
          <Photo src={photo("golden", 900, 700)} alt="" className="absolute inset-y-0 right-0 hidden h-full w-2/5 opacity-90 [mask-image:linear-gradient(to_left,black_55%,transparent)] md:block" />
          <div className="relative max-w-xl px-6 py-12 sm:px-12">
            <h2 className="text-3xl font-semibold sm:text-4xl">Love pets? Earn by caring for them.</h2>
            <p className="mt-3 text-white/80">Set your own daily price, accept the bookings you want and get paid after every stay.</p>
            <ButtonLink href="/register" variant="accent" size="lg" className="mt-6">Become a caretaker</ButtonLink>
          </div>
        </div>
      </div>
      </section>
    </>
  );
}
