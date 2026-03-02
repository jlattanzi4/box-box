import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="bg-mesh bg-dot-pattern flex flex-col items-center justify-center min-h-[80vh] gap-12 relative">
      {/* Content sits above the mesh ::before pseudo-element */}
      <div className="relative z-10 text-center space-y-6">
        <div className="inline-flex items-center gap-3 mb-2">
          <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_30px_-5px_var(--f1-red)] animate-[glow-pulse_3s_ease-in-out_infinite]">
            <span className="text-2xl font-black text-primary-foreground">BB</span>
          </div>
        </div>
        <h1 className="text-6xl sm:text-7xl font-black tracking-tighter">
          <span className="inline-block animate-[fade-in-up_0.6s_ease-out_both]">Box </span>
          <span className="inline-block text-primary animate-[fade-in-up_0.6s_ease-out_0.2s_both]">Box</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-md mx-auto leading-relaxed animate-[fade-in-up_0.6s_ease-out_0.4s_both]">
          Pick your drivers and constructors. Race against your friends.
          Score points from real F1 results.
        </p>
      </div>

      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full stagger-children">
        <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 space-y-2 overflow-hidden relative group hover:-translate-y-1 hover:shadow-[0_0_30px_-10px_var(--f1-red)] transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#FF8700] via-[#E80020] to-[#3671C6]" />
          <div className="text-3xl font-black text-primary">22</div>
          <h3 className="font-semibold">Drivers</h3>
          <p className="text-sm text-muted-foreground">
            Each driver once per season. Choose wisely.
          </p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 space-y-2 overflow-hidden relative group hover:-translate-y-1 hover:shadow-[0_0_30px_-10px_var(--f1-red)] transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#27F4D2] via-[#229971] to-[#64C4FF]" />
          <div className="text-3xl font-black text-primary">11</div>
          <h3 className="font-semibold">Constructors</h3>
          <p className="text-sm text-muted-foreground">
            Each constructor twice. Pair them strategically.
          </p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 space-y-2 overflow-hidden relative group hover:-translate-y-1 hover:shadow-[0_0_30px_-10px_var(--f1-red)] transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#FF87BC] via-[#E80020] to-[#6692FF]" />
          <div className="text-3xl font-black text-primary">RC</div>
          <h3 className="font-semibold">Race Control</h3>
          <p className="text-sm text-muted-foreground">
            Safety cars, red flags, and chaos score big.
          </p>
        </div>
      </div>

      <div className="relative z-10 flex gap-4 animate-[fade-in-up_0.6s_ease-out_0.6s_both]">
        <Link href="/register">
          <Button size="lg" className="px-8 font-semibold hover:shadow-[0_0_25px_-5px_var(--f1-red)] transition-shadow duration-300">
            Get Started
          </Button>
        </Link>
        <Link href="/login">
          <Button variant="outline" size="lg" className="px-8 border-border/50">
            Sign In
          </Button>
        </Link>
      </div>
    </div>
  );
}
