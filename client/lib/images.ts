/** Stock photography (Unsplash). Components fall back to an emoji panel if an image fails to load. */
const u = (id: string, w = 800, h?: number) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}${h ? `&h=${h}` : ""}&q=70`;

const ID = {
  hero: "1548199973-03cce0bbc87b", // two dogs at sunset
  golden: "1552053831-71594a27632d",
  runner: "1534361960057-19889db9621e",
  beagle: "1543466835-00a7907e9de1",
  bulldog: "1583511655857-d19b40a7a54e",
  cat: "1514888286974-6c03e2ca1dba",
  puppy: "1587300003388-59208cc962cb",
  rabbit: "1585110396000-c9ffd4e4b308",
  food: "1589924691995-400dc9ecc119",
  glasses: "1535930749574-1399327ce78f",
} as const;

export const photo = (key: keyof typeof ID, w = 800, h?: number) => u(ID[key], w, h);

const byType: Record<string, (keyof typeof ID)[]> = {
  Dog: ["golden", "runner", "beagle", "bulldog", "puppy"],
  Cat: ["cat"],
  Rabbit: ["rabbit"],
};

/** Stable photo for a pet type, varied by a seed such as an id. */
export function petPhoto(type: string | undefined, seed = "", w = 800, h?: number) {
  const list = byType[type ?? ""];
  if (!list) return undefined;
  const n = [...seed].reduce((s, c) => s + c.charCodeAt(0), 0);
  return photo(list[n % list.length], w, h);
}

const byCategory: Record<string, keyof typeof ID> = { Food: "food", Toys: "runner", Accessories: "bulldog" };
export const productPhoto = (category: string | undefined, w = 600, h = 450) => photo(byCategory[category ?? ""] ?? "puppy", w, h);
