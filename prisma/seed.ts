import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const constructors2026 = [
  { jolpicaId: "mclaren", name: "McLaren" },
  { jolpicaId: "ferrari", name: "Ferrari" },
  { jolpicaId: "red_bull", name: "Red Bull" },
  { jolpicaId: "mercedes", name: "Mercedes" },
  { jolpicaId: "aston_martin", name: "Aston Martin" },
  { jolpicaId: "alpine", name: "Alpine" },
  { jolpicaId: "haas", name: "Haas" },
  { jolpicaId: "rb", name: "Racing Bulls" },
  { jolpicaId: "williams", name: "Williams" },
  { jolpicaId: "audi", name: "Audi" },
  { jolpicaId: "cadillac", name: "Cadillac" },
];

const drivers2026 = [
  { jolpicaId: "norris", code: "NOR", firstName: "Lando", lastName: "Norris", number: 4, constructorJolpicaId: "mclaren" },
  { jolpicaId: "piastri", code: "PIA", firstName: "Oscar", lastName: "Piastri", number: 81, constructorJolpicaId: "mclaren" },
  { jolpicaId: "leclerc", code: "LEC", firstName: "Charles", lastName: "Leclerc", number: 16, constructorJolpicaId: "ferrari" },
  { jolpicaId: "hamilton", code: "HAM", firstName: "Lewis", lastName: "Hamilton", number: 44, constructorJolpicaId: "ferrari" },
  { jolpicaId: "max_verstappen", code: "VER", firstName: "Max", lastName: "Verstappen", number: 1, constructorJolpicaId: "red_bull" },
  { jolpicaId: "hadjar", code: "HAD", firstName: "Isack", lastName: "Hadjar", number: 6, constructorJolpicaId: "red_bull" },
  { jolpicaId: "russell", code: "RUS", firstName: "George", lastName: "Russell", number: 63, constructorJolpicaId: "mercedes" },
  { jolpicaId: "antonelli", code: "ANT", firstName: "Kimi", lastName: "Antonelli", number: 12, constructorJolpicaId: "mercedes" },
  { jolpicaId: "alonso", code: "ALO", firstName: "Fernando", lastName: "Alonso", number: 14, constructorJolpicaId: "aston_martin" },
  { jolpicaId: "stroll", code: "STR", firstName: "Lance", lastName: "Stroll", number: 18, constructorJolpicaId: "aston_martin" },
  { jolpicaId: "gasly", code: "GAS", firstName: "Pierre", lastName: "Gasly", number: 10, constructorJolpicaId: "alpine" },
  { jolpicaId: "colapinto", code: "COL", firstName: "Franco", lastName: "Colapinto", number: 43, constructorJolpicaId: "alpine" },
  { jolpicaId: "ocon", code: "OCO", firstName: "Esteban", lastName: "Ocon", number: 31, constructorJolpicaId: "haas" },
  { jolpicaId: "bearman", code: "BEA", firstName: "Oliver", lastName: "Bearman", number: 87, constructorJolpicaId: "haas" },
  { jolpicaId: "lawson", code: "LAW", firstName: "Liam", lastName: "Lawson", number: 30, constructorJolpicaId: "rb" },
  { jolpicaId: "lindblad", code: "LIN", firstName: "Arvid", lastName: "Lindblad", number: 27, constructorJolpicaId: "rb" },
  { jolpicaId: "albon", code: "ALB", firstName: "Alex", lastName: "Albon", number: 23, constructorJolpicaId: "williams" },
  { jolpicaId: "sainz", code: "SAI", firstName: "Carlos", lastName: "Sainz", number: 55, constructorJolpicaId: "williams" },
  { jolpicaId: "hulkenberg", code: "HUL", firstName: "Nico", lastName: "Hulkenberg", number: 27, constructorJolpicaId: "audi" },
  { jolpicaId: "bortoleto", code: "BOR", firstName: "Gabriel", lastName: "Bortoleto", number: 5, constructorJolpicaId: "audi" },
  { jolpicaId: "bottas", code: "BOT", firstName: "Valtteri", lastName: "Bottas", number: 77, constructorJolpicaId: "cadillac" },
  { jolpicaId: "perez", code: "PER", firstName: "Sergio", lastName: "Perez", number: 11, constructorJolpicaId: "cadillac" },
];

const races2026 = [
  { round: 1, name: "Australian Grand Prix", circuitName: "Albert Park Circuit", country: "Australia", raceDate: "2026-03-08T04:00:00Z" },
  { round: 2, name: "Chinese Grand Prix", circuitName: "Shanghai International Circuit", country: "China", raceDate: "2026-03-15T07:00:00Z" },
  { round: 3, name: "Japanese Grand Prix", circuitName: "Suzuka International Racing Course", country: "Japan", raceDate: "2026-03-29T05:00:00Z" },
  { round: 4, name: "Bahrain Grand Prix", circuitName: "Bahrain International Circuit", country: "Bahrain", raceDate: "2026-04-12T15:00:00Z" },
  { round: 5, name: "Saudi Arabian Grand Prix", circuitName: "Jeddah Corniche Circuit", country: "Saudi Arabia", raceDate: "2026-04-19T17:00:00Z" },
  { round: 6, name: "Miami Grand Prix", circuitName: "Miami International Autodrome", country: "USA", raceDate: "2026-05-03T20:00:00Z" },
  { round: 7, name: "Canadian Grand Prix", circuitName: "Circuit Gilles-Villeneuve", country: "Canada", raceDate: "2026-05-24T18:00:00Z" },
  { round: 8, name: "Monaco Grand Prix", circuitName: "Circuit de Monaco", country: "Monaco", raceDate: "2026-06-07T13:00:00Z" },
  { round: 9, name: "Spanish Grand Prix", circuitName: "Circuit de Barcelona-Catalunya", country: "Spain", raceDate: "2026-06-14T13:00:00Z" },
  { round: 10, name: "Austrian Grand Prix", circuitName: "Red Bull Ring", country: "Austria", raceDate: "2026-06-28T13:00:00Z" },
  { round: 11, name: "British Grand Prix", circuitName: "Silverstone Circuit", country: "Great Britain", raceDate: "2026-07-05T14:00:00Z" },
  { round: 12, name: "Belgian Grand Prix", circuitName: "Circuit de Spa-Francorchamps", country: "Belgium", raceDate: "2026-07-19T13:00:00Z" },
  { round: 13, name: "Hungarian Grand Prix", circuitName: "Hungaroring", country: "Hungary", raceDate: "2026-07-26T13:00:00Z" },
  { round: 14, name: "Dutch Grand Prix", circuitName: "Circuit Zandvoort", country: "Netherlands", raceDate: "2026-08-23T13:00:00Z" },
  { round: 15, name: "Italian Grand Prix", circuitName: "Autodromo Nazionale Monza", country: "Italy", raceDate: "2026-09-06T13:00:00Z" },
  { round: 16, name: "Madrid Grand Prix", circuitName: "Madrid Street Circuit", country: "Spain", raceDate: "2026-09-13T13:00:00Z" },
  { round: 17, name: "Azerbaijan Grand Prix", circuitName: "Baku City Circuit", country: "Azerbaijan", raceDate: "2026-09-26T11:00:00Z" },
  { round: 18, name: "Singapore Grand Prix", circuitName: "Marina Bay Street Circuit", country: "Singapore", raceDate: "2026-10-11T12:00:00Z" },
  { round: 19, name: "United States Grand Prix", circuitName: "Circuit of the Americas", country: "USA", raceDate: "2026-10-25T19:00:00Z" },
  { round: 20, name: "Mexico City Grand Prix", circuitName: "Autodromo Hermanos Rodriguez", country: "Mexico", raceDate: "2026-11-01T20:00:00Z" },
  { round: 21, name: "São Paulo Grand Prix", circuitName: "Interlagos", country: "Brazil", raceDate: "2026-11-08T17:00:00Z" },
  { round: 22, name: "Las Vegas Grand Prix", circuitName: "Las Vegas Strip Circuit", country: "USA", raceDate: "2026-11-22T06:00:00Z" },
  { round: 23, name: "Qatar Grand Prix", circuitName: "Lusail International Circuit", country: "Qatar", raceDate: "2026-11-29T16:00:00Z" },
  { round: 24, name: "Abu Dhabi Grand Prix", circuitName: "Yas Marina Circuit", country: "Abu Dhabi", raceDate: "2026-12-06T13:00:00Z" },
];

async function main() {
  console.log("Seeding 2026 F1 data...");

  const constructorMap: Record<string, string> = {};
  for (const c of constructors2026) {
    const record = await prisma.constructor.upsert({
      where: { jolpicaId: c.jolpicaId },
      update: { name: c.name },
      create: { jolpicaId: c.jolpicaId, name: c.name },
    });
    constructorMap[c.jolpicaId] = record.id;
  }
  console.log(`  ✓ ${constructors2026.length} constructors`);

  for (const d of drivers2026) {
    await prisma.driver.upsert({
      where: { jolpicaId: d.jolpicaId },
      update: {
        code: d.code, firstName: d.firstName, lastName: d.lastName,
        number: d.number, constructorId: constructorMap[d.constructorJolpicaId],
      },
      create: {
        jolpicaId: d.jolpicaId, code: d.code, firstName: d.firstName,
        lastName: d.lastName, number: d.number,
        constructorId: constructorMap[d.constructorJolpicaId],
      },
    });
  }
  console.log(`  ✓ ${drivers2026.length} drivers`);

  for (const r of races2026) {
    const raceDate = new Date(r.raceDate);
    await prisma.race.upsert({
      where: { seasonYear_round: { seasonYear: 2026, round: r.round } },
      update: { name: r.name, circuitName: r.circuitName, country: r.country, raceDate, pickDeadline: raceDate },
      create: {
        seasonYear: 2026, round: r.round, name: r.name, circuitName: r.circuitName,
        country: r.country, raceDate, pickDeadline: raceDate,
        status: raceDate < new Date() ? "completed" : "upcoming",
      },
    });
  }
  console.log(`  ✓ ${races2026.length} races`);
  console.log("Seed complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
