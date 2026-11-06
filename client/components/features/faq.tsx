const items = [
  ["How are caretakers verified?", "Every caretaker uploads an ID and address proof. Our team reviews the documents and only approved caretakers appear in search with the Verified badge."],
  ["When do I pay, and is my money safe?", "You pay after the caretaker accepts. PawStay holds the payment and releases it to the caretaker only after your pet is back and a short dispute window has passed."],
  ["What if I need to cancel?", "Cancel 48 hours or more before the stay for a full refund. Between 24 and 48 hours you get 50% of the care amount. If a caretaker cancels, you always get 100% back."],
  ["Will I know how my pet is doing?", "Yes. Your caretaker posts a photo and a note every day, you can chat inside the booking, and there is an emergency button that alerts you and our team."],
  ["What does my pet need before a booking?", "A pet profile with a vaccination certificate. Add feeding, medicine and behaviour notes so your caretaker knows exactly what to do."],
];

export function Faq() {
  return (
    <div className="divide-y divide-border rounded-2xl border border-border bg-surface">
      {items.map(([q, a]) => (
        <details key={q} className="group px-5 py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
            {q}
            <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-lg transition group-open:rotate-45">+</span>
          </summary>
          <p className="mt-3 pr-10 text-sm text-muted">{a}</p>
        </details>
      ))}
    </div>
  );
}
