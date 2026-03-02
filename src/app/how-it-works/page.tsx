import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const driverPoints = [
  { pos: "1st", pts: 25 },
  { pos: "2nd", pts: 18 },
  { pos: "3rd", pts: 15 },
  { pos: "4th", pts: 12 },
  { pos: "5th", pts: 10 },
  { pos: "6th", pts: 8 },
  { pos: "7th", pts: 6 },
  { pos: "8th", pts: 4 },
  { pos: "9th", pts: 2 },
  { pos: "10th", pts: 1 },
];

const raceControlEvents = [
  { event: "Red Flag", pts: 15, color: "bg-red-500/15 text-red-400 border-red-500/30", desc: "Race stopped due to dangerous conditions" },
  { event: "Safety Car", pts: 5, color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", desc: "Physical safety car deployed on track" },
  { event: "Virtual Safety Car", pts: 3, color: "bg-amber-500/15 text-amber-400 border-amber-500/30", desc: "VSC period with speed limits" },
  { event: "Wet Race", pts: 5, color: "bg-blue-500/15 text-blue-400 border-blue-500/30", desc: "Intermediate or wet tyres used during race" },
  { event: "DNF", pts: 2, color: "bg-orange-500/15 text-orange-400 border-orange-500/30", desc: "Per driver that does not finish (stacks)" },
  { event: "Penalty", pts: 1, color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30", desc: "Per time or grid penalty issued (stacks)" },
];

export default function HowItWorksPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 stagger-children">
      {/* Hero */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-black tracking-tight">How It Works</h1>
        <p className="text-muted-foreground text-lg max-w-lg mx-auto">
          Everything you need to know about playing Box Box.
          Strategic picks across 24 races decide the champion.
        </p>
      </div>

      {/* Overview */}
      <Card className="border-border/50 bg-card/50 overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#FF8700] via-[#E80020] to-[#3671C6]" />
        <CardHeader>
          <CardTitle className="text-xl font-bold">The Basics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <p>
            Every race weekend, you make <strong>one pick</strong> for your league.
            You choose either a <strong>Driver + Constructor</strong> pairing or a
            <strong> Race Control</strong> pick. After the race, points are automatically
            calculated from real-world F1 results.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border/50 bg-background/50 p-4 text-center">
              <div className="text-2xl font-black text-primary">22</div>
              <p className="text-xs text-muted-foreground mt-1">Drivers — use each <strong>once</strong></p>
            </div>
            <div className="rounded-lg border border-border/50 bg-background/50 p-4 text-center">
              <div className="text-2xl font-black text-primary">11</div>
              <p className="text-xs text-muted-foreground mt-1">Constructors — use each <strong>twice</strong></p>
            </div>
            <div className="rounded-lg border border-border/50 bg-background/50 p-4 text-center">
              <div className="text-2xl font-black text-primary">2</div>
              <p className="text-xs text-muted-foreground mt-1">Race Control picks per season</p>
            </div>
          </div>
          <p className="text-muted-foreground">
            With 24 races and 22 drivers, you&apos;ll use every driver plus have 2 races
            to play the Race Control wildcard. The constructor limit means you need to spread
            your bets across the grid — no picking the same top team every week.
          </p>
        </CardContent>
      </Card>

      {/* Driver + Constructor Scoring */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Driver + Constructor Scoring</CardTitle>
          <CardDescription>
            Points are based on real F1 World Championship points
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3">Driver Points</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Your driver earns the same points they score in the real race.
            </p>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {driverPoints.map((d) => (
                <div key={d.pos} className="rounded-lg border border-border/50 bg-background/50 p-2 text-center">
                  <div className="text-xs text-muted-foreground">{d.pos}</div>
                  <div className="text-lg font-black text-primary">{d.pts}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Drivers finishing outside the top 10 score 0 points. Fastest lap earns +1 point if the driver finishes in the top 10.
            </p>
          </div>

          <div className="border-t border-border/30 pt-4">
            <h3 className="font-semibold mb-3">Constructor Points</h3>
            <p className="text-sm text-muted-foreground">
              Your constructor earns the combined points of <strong>both</strong> their
              drivers in the real race. For example, if McLaren&apos;s two drivers finish
              P1 (25 pts) and P4 (12 pts), picking McLaren as your constructor earns you
              <strong> 37 points</strong>.
            </p>
          </div>

          <div className="border-t border-border/30 pt-4">
            <h3 className="font-semibold mb-2">Total Score Example</h3>
            <div className="rounded-lg border border-border/50 bg-background/50 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Your driver (Norris) finishes P2</span>
                <span className="font-mono font-bold">18 pts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">McLaren drivers finish P2 + P5</span>
                <span className="font-mono font-bold">28 pts</span>
              </div>
              <div className="flex justify-between border-t border-border/30 pt-2">
                <span className="font-semibold">Your total for the race</span>
                <span className="font-mono font-bold text-primary text-lg">46 pts</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Race Control Scoring */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Race Control Scoring</CardTitle>
          <CardDescription>
            Skip the driver pick and bet on chaos instead — you get 2 per season
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Race Control picks earn points based on events that happen during the
            race. The more chaotic the race, the more you score. DNF and penalty
            points <strong>stack</strong> — 5 DNFs means 10 points.
          </p>
          <Table>
            <TableHeader>
              <TableRow className="border-border/30">
                <TableHead>Event</TableHead>
                <TableHead>Points</TableHead>
                <TableHead className="hidden sm:table-cell">Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {raceControlEvents.map((e) => (
                <TableRow key={e.event} className="border-border/20">
                  <TableCell>
                    <Badge variant="outline" className={`text-xs border ${e.color}`}>
                      {e.event}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono font-bold text-lg">
                    {e.pts}
                    <span className="text-xs text-muted-foreground font-normal ml-1">pts</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                    {e.desc}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="rounded-lg border border-border/50 bg-background/50 p-4 space-y-2 text-sm">
            <h4 className="font-semibold">Example: A chaotic race</h4>
            <div className="flex justify-between">
              <span className="text-muted-foreground">1 Safety Car</span>
              <span className="font-mono font-bold">5 pts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">1 Red Flag</span>
              <span className="font-mono font-bold">15 pts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">3 DNFs</span>
              <span className="font-mono font-bold">6 pts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">2 Penalties</span>
              <span className="font-mono font-bold">2 pts</span>
            </div>
            <div className="flex justify-between border-t border-border/30 pt-2">
              <span className="font-semibold">Race Control total</span>
              <span className="font-mono font-bold text-primary text-lg">28 pts</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strategy */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Strategy Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground">Plan your constructors.</strong> You
            only get to use each constructor twice. Save the top teams for races where
            you expect them to dominate.
          </p>
          <p>
            <strong className="text-foreground">Don&apos;t waste drivers on bad tracks.</strong> If
            a driver&apos;s team is historically weak at a circuit, save them for a race
            where they&apos;ll score higher.
          </p>
          <p>
            <strong className="text-foreground">Use Race Control wisely.</strong> Save
            your 2 Race Control picks for street circuits or historically chaotic races
            (Monaco, Singapore, Jeddah) where safety cars and red flags are more likely.
          </p>
          <p>
            <strong className="text-foreground">Mix driver + constructor teams.</strong> You
            don&apos;t have to pair a driver with their own constructor. Pick a midfield driver
            you think will overperform, paired with a top constructor for guaranteed
            constructor points.
          </p>
        </CardContent>
      </Card>

      {/* Deadlines */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Deadlines &amp; Leagues</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground">Picks lock at race start.</strong> You
            must submit your pick before the formation lap begins. You can change your
            pick as many times as you want before the deadline.
          </p>
          <p>
            <strong className="text-foreground">Private leagues.</strong> Create a
            league and share the invite code with friends. Each league has its own
            standings — you can be in multiple leagues at once.
          </p>
          <p>
            <strong className="text-foreground">Auto-scoring.</strong> Points are
            calculated automatically after each race from official F1 results. No
            manual input needed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
