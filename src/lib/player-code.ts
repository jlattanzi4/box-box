/**
 * Three-letter timing-screen codes for league members, the way drivers get
 * VER / NOR / LEC. Surname first three letters; collisions fall back to
 * initial + two of surname; anything still clashing gets a digit.
 */
export function playerCodes<T extends { id: string; name: string }>(
  members: T[]
): Map<string, string> {
  const clean = (s: string) => s.replace(/[^A-Za-z]/g, "").toUpperCase();
  const base = (name: string) => {
    const parts = name.trim().split(/\s+/).map(clean).filter(Boolean);
    if (parts.length === 0) return "PLR";
    const surname = parts[parts.length - 1];
    return (surname + "XXX").slice(0, 3);
  };
  const alt = (name: string) => {
    const parts = name.trim().split(/\s+/).map(clean).filter(Boolean);
    if (parts.length < 2) return base(name);
    return (parts[0][0] + parts[parts.length - 1] + "XX").slice(0, 3);
  };

  const result = new Map<string, string>();
  const taken = new Map<string, number>();

  const first = members.map((m) => base(m.name));
  const counts = new Map<string, number>();
  for (const c of first) counts.set(c, (counts.get(c) ?? 0) + 1);

  members.forEach((m, i) => {
    let code = counts.get(first[i])! > 1 ? alt(m.name) : first[i];
    if (taken.has(code)) {
      const n = taken.get(code)! + 1;
      taken.set(code, n);
      code = code.slice(0, 2) + n;
    } else {
      taken.set(code, 1);
    }
    result.set(m.id, code);
  });

  return result;
}
