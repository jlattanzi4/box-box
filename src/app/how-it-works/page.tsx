import { PageHeader } from "@/components/page-header";
import { RACE_CONTROL_POINTS } from "@/types";

const DRIVER_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

const RC_EVENTS: { key: keyof typeof RACE_CONTROL_POINTS; label: string; color: string; note: string }[] = [
  { key: "red_flag", label: "Red flag", color: "var(--kerb-red)", note: "Race stopped" },
  { key: "safety_car", label: "Safety car", color: "var(--flag-yellow)", note: "Physical safety car deployed" },
  { key: "vsc", label: "Virtual safety car", color: "#f0b429", note: "VSC period called" },
  { key: "wet", label: "Wet race", color: "var(--wet-blue)", note: "Declared wet by race control" },
  { key: "dnf", label: "Each DNF", color: "#ff7a3d", note: "Per car that retires or stops" },
  { key: "penalty", label: "Each penalty", color: "var(--chalk-dim)", note: "Per time or grid penalty" },
];

function Board({ title, eyebrow, children }: { title: string; eyebrow?: string; children: React.ReactNode }) {
  return (
    <section className="pit-board">
      <div className="px-5 py-4 border-b border-asphalt-700">
        {eyebrow && <p className="t-eyebrow mb-1">{eyebrow}</p>}
        <h2 className="t-display text-3xl text-chalk">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <PageHeader
        eyebrow="The rules"
        title="How it works"
        description="One pick per race. The constraints are the whole game: you can't just take McLaren every week."
      />

      <div className="space-y-6 stagger">
        <Board title="Each race, one pick" eyebrow="The basics">
          <div className="pit-board-row">
            <span className="text-chalk-dim">A driver, used once all season</span>
            <span className="pit-board-value text-3xl">22 drivers</span>
          </div>
          <div className="pit-board-row">
            <span className="text-chalk-dim">Plus a constructor, twice each</span>
            <span className="pit-board-value text-3xl">11 teams</span>
          </div>
          <div className="pit-board-row">
            <span className="text-chalk-dim">Or skip both and bet on chaos</span>
            <span className="pit-board-value text-3xl">2 Race Control</span>
          </div>
          <p className="px-5 py-4 text-sm text-chalk-dim border-t border-asphalt-700">
            The driver and the constructor don&apos;t have to match. Pair a midfielder you think will
            overperform with a front-running team for guaranteed constructor points. Picks lock when the
            lights go out and you can change them as often as you like before that.
          </p>
        </Board>

        <Board title="Driver + constructor" eyebrow="Scoring">
          <div className="px-5 py-4 space-y-3">
            <p className="text-sm text-chalk-dim">
              Your driver scores exactly what they score in the real championship.
            </p>
            <ol className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
              {DRIVER_POINTS.map((pts, i) => (
                <li key={i} className="rounded border border-asphalt-600 bg-asphalt-900 py-2 text-center">
                  <span className="block t-eyebrow">P{i + 1}</span>
                  <span className="block t-num font-bold text-lg text-chalk">{pts}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="pit-board-row">
            <span className="text-sm text-chalk-dim max-w-[60%]">
              Your constructor scores <span className="text-chalk">both</span> of its cars combined.
            </span>
            <span className="pit-board-value text-2xl text-right">P1 + P4 = 37</span>
          </div>
          <div className="pit-board-row">
            <span className="text-sm text-chalk-dim">Norris P2 with McLaren P2 + P5</span>
            <span className="pit-board-value text-2xl">18 + 28 = 46</span>
          </div>
        </Board>

        <Board title="Race Control" eyebrow="The wildcard · twice a season">
          <p className="px-5 py-4 text-sm text-chalk-dim border-b border-asphalt-700">
            No driver, no team. You score every incident the marshals log. DNFs and penalties stack, so
            a wet street race can outscore a race win.
          </p>
          <ul>
            {RC_EVENTS.map((e) => (
              <li key={e.key} className="pit-board-row items-center">
                <span className="flex items-center gap-3 min-w-0">
                  <span className="size-3 rounded-sm shrink-0" style={{ backgroundColor: e.color }} />
                  <span className="text-sm">{e.label}</span>
                  <span className="text-xs text-chalk-faint truncate hidden sm:inline">{e.note}</span>
                </span>
                <span className="pit-board-value text-2xl t-num">+{RACE_CONTROL_POINTS[e.key]}</span>
              </li>
            ))}
          </ul>
          <div className="pit-board-row bg-asphalt-900">
            <span className="text-sm text-chalk-dim">Red flag, one safety car, three DNFs, two penalties</span>
            <span className="pit-board-value text-2xl t-num">28</span>
          </div>
        </Board>

        <Board title="Play it smart" eyebrow="Strategy">
          <ul className="divide-y divide-asphalt-700">
            <li className="px-5 py-3.5 text-sm">
              <span className="text-chalk font-semibold">Ration the top teams.</span>{" "}
              <span className="text-chalk-dim">Two uses each. Spend them where that team is fastest.</span>
            </li>
            <li className="px-5 py-3.5 text-sm">
              <span className="text-chalk font-semibold">Don&apos;t burn a good driver at a bad track.</span>{" "}
              <span className="text-chalk-dim">Every driver is a one-shot. Save them for a circuit that suits the car.</span>
            </li>
            <li className="px-5 py-3.5 text-sm">
              <span className="text-chalk font-semibold">Keep Race Control for chaos.</span>{" "}
              <span className="text-chalk-dim">Street circuits, rain, and first-lap carnage venues like Singapore and Baku.</span>
            </li>
            <li className="px-5 py-3.5 text-sm">
              <span className="text-chalk font-semibold">Scoring is automatic.</span>{" "}
              <span className="text-chalk-dim">Official results are pulled the morning after each race. Nothing to submit.</span>
            </li>
          </ul>
        </Board>
      </div>
    </div>
  );
}
