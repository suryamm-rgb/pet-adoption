import bcrypt from "bcryptjs";
import { connectDb } from "./config/db.js";
import { CaretakerProfile, Product, User, getSettings } from "./models/index.js";

await connectDb();
await getSettings();
const hash = await bcrypt.hash("Password123", 10);
const mk = (name, email, roles, city) =>
  User.findOneAndUpdate({ email }, { name, email, roles, city, passwordHash: hash, emailVerified: true }, { upsert: true, returnDocument: "after" });

await mk("Platform Admin", "admin@pawstay.test", ["admin", "owner"], "Bengaluru");
await mk("Ravi Kumar", "ravi@pawstay.test", ["owner", "seller"], "Bengaluru");
const caretakers = [
  ["Anita Rao", "anita@pawstay.test", "Bengaluru", 50000, "House with garden", ["Dog", "Cat"], 6, "Full-time pet lover working from home. Daily walks, play time and a photo update every evening."],
  ["Imran Sheikh", "imran@pawstay.test", "Mumbai", 65000, "Apartment", ["Cat", "Rabbit"], 3, "Calm apartment, ideal for cats and small pets. Vet clinic two minutes away."],
  ["Meera Nair", "meera@pawstay.test", "Chennai", 45000, "House with garden", ["Dog"], 8, "Retired vet nurse, comfortable with medication and senior pets."],
];
for (const [name, email, city, price, home, types, years, bio] of caretakers) {
  const u = await mk(name, email, ["owner", "caretaker"], city);
  await CaretakerProfile.findOneAndUpdate(
    { userId: u._id },
    { userId: u._id, city, pricePerDay: price, homeType: home, acceptedPetTypes: types, experienceYears: years, bio, maxPets: 2, hasGarden: home.includes("garden"), address: `12 Park Road, ${city}`, idProofUrl: "/seed/id.pdf", addressProofUrl: "/seed/addr.pdf", verificationStatus: "approved", ratingAvg: 4.8, ratingCount: 24 },
    { upsert: true },
  );
}
if (!(await Product.countDocuments())) {
  await Product.insertMany([
    { name: "Premium dog food 3kg", category: "Food", price: 129900, stock: 40, description: "Chicken and rice, no artificial colours." },
    { name: "Cat scratching post", category: "Toys", price: 89900, stock: 25, description: "Sisal rope, stable base." },
    { name: "Adjustable dog harness", category: "Accessories", price: 59900, stock: 60, description: "Padded, reflective, sizes S to XL." },
    { name: "Pet travel carrier", category: "Accessories", price: 149900, stock: 15, description: "Airline-friendly, ventilated." },
  ]);
}
console.log("Seeded. Logins (password Password123): admin@pawstay.test, ravi@pawstay.test, anita@pawstay.test");
process.exit(0);
