# Box Box

**F1 fantasy head-to-head — pick your drivers, race your friends, score from real results.**

Box Box is a private-league F1 fantasy game built for the 2026 season. Each race, you pick a driver + constructor pairing (or go wild with Race Control). Points are scored from real-world F1 race results, and the constraint system forces strategic thinking across the full 24-race calendar.

## How It Works

### The Rules
- **22 drivers**, each usable **once** per season
- **11 constructors**, each usable **twice** per season
- **2 Race Control picks** per season — score points from red flags, safety cars, VSCs, DNFs, wet races, and penalties
- Picks lock at race start — no changes once lights go out

### Scoring
**Driver + Constructor picks** earn points based on real race finishing positions (via Jolpica F1 API).

**Race Control picks** earn points from events during the race (via OpenF1 API):

| Event | Points |
|-------|--------|
| Red Flag | 15 |
| Safety Car | 5 |
| Virtual Safety Car | 3 |
| Wet Race | 5 |
| DNF | 2 (per DNF) |
| Penalty | 1 (per penalty) |

### Leagues
Create private leagues and share an invite code with friends. Each league has its own standings, pick history, and race-by-race results.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Language | TypeScript |
| Database | PostgreSQL via [Neon](https://neon.tech) |
| ORM | [Prisma 7](https://prisma.io) with `@prisma/adapter-pg` |
| Auth | [NextAuth v5](https://authjs.dev) (credentials) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) |
| Email | [Resend](https://resend.com) (pick reminders) |
| F1 Data | [Jolpica API](https://github.com/jolpica/jolpica-f1) + [OpenF1 API](https://openf1.org) |
| Hosting | [Vercel](https://vercel.com) |

## Features

- **Team-color UI** — every driver and constructor displays with their real F1 team color (McLaren orange, Ferrari red, Mercedes teal, etc.)
- **Animated backgrounds** — gradient mesh, dot patterns, glow effects, staggered entrance animations
- **Smart pick page** — auto-selects the next upcoming race, shows remaining drivers/constructors with team-color indicators
- **Live constraints** — tracks which drivers and constructors you've already used, prevents invalid picks
- **Race Control mode** — opt out of a driver pick and bet on chaos instead
- **Auto-scoring** — Vercel cron job fetches real race results and scores all picks automatically
- **Email reminders** — notifies league members who haven't picked the day before a race
- **Responsive** — works on mobile, tablet, and desktop

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (recommend [Neon](https://neon.tech) free tier)

### Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/jlattanzi4/box-box.git
   cd box-box
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Then fill in your values:
   ```
   DATABASE_URL="your-neon-connection-string"
   NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"
   NEXTAUTH_URL="http://localhost:3000"
   CRON_SECRET="any-random-secret"
   RESEND_API_KEY="optional-for-email-reminders"
   ```

4. **Set up the database**
   ```bash
   npx prisma migrate deploy
   ```

5. **Seed race data**
   ```bash
   npx tsx prisma/seed.ts
   ```

6. **Run the dev server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── dashboard/                  # User dashboard (league list)
│   ├── leagues/
│   │   ├── [id]/
│   │   │   ├── page.tsx            # League detail (standings, current pick)
│   │   │   ├── picks/page.tsx      # Make/edit picks
│   │   │   ├── results/page.tsx    # Race-by-race results
│   │   │   └── history/page.tsx    # Full season pick matrix
│   │   ├── create/                 # Create league
│   │   └── join/                   # Join with invite code
│   ├── (auth)/                     # Login + Register
│   └── api/
│       ├── picks/                  # CRUD for picks
│       ├── leagues/                # League management
│       └── cron/
│           ├── update-results/     # Auto-scoring cron
│           └── send-reminders/     # Email reminder cron
├── lib/
│   ├── auth.ts                     # NextAuth config
│   ├── prisma.ts                   # Database client
│   ├── team-colors.ts              # F1 team color map
│   ├── constraints.ts              # Pick validation logic
│   ├── scoring.ts                  # Points calculation
│   ├── jolpica.ts                  # Race results API
│   ├── openf1.ts                   # Race events API
│   └── email.ts                    # Resend integration
├── components/
│   ├── navbar.tsx
│   └── ui/                         # shadcn/ui components
└── types/
    └── index.ts                    # Shared types + constants
```

## Deployment

The app is deployed on Vercel. Pushes to `main` auto-deploy.

### Cron Jobs

Configured in `vercel.json`:

| Job | Schedule | Purpose |
|-----|----------|---------|
| `/api/cron/update-results` | Mondays 10:00 UTC | Fetches race results and scores picks |
| `/api/cron/send-reminders` | Fri + Sat 12:00 UTC | Emails users who haven't picked |

## 2026 Season

Box Box is configured for the 2026 F1 season:

- **11 constructors**: McLaren, Ferrari, Red Bull, Mercedes, Aston Martin, Alpine, Haas, Racing Bulls, Williams, Audi (formerly Sauber), Cadillac (new entry)
- **22 drivers** across all teams
- **24 races** from Australia to Abu Dhabi

## License

MIT
