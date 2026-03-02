export const TEAM_COLORS: Record<string, string> = {
  // By jolpicaId
  mclaren: "#FF8700",
  ferrari: "#E80020",
  red_bull: "#3671C6",
  mercedes: "#27F4D2",
  aston_martin: "#229971",
  alpine: "#FF87BC",
  haas: "#B6BABD",
  rb: "#6692FF",
  williams: "#64C4FF",
  audi: "#FF0000",
  cadillac: "#1E4D2B",
};

export const TEAM_COLORS_BY_NAME: Record<string, string> = {
  McLaren: "#FF8700",
  Ferrari: "#E80020",
  "Red Bull": "#3671C6",
  Mercedes: "#27F4D2",
  "Aston Martin": "#229971",
  Alpine: "#FF87BC",
  Haas: "#B6BABD",
  "Racing Bulls": "#6692FF",
  Williams: "#64C4FF",
  Audi: "#FF0000",
  Cadillac: "#1E4D2B",
};

export function getTeamColor(identifier: string | null | undefined): string {
  if (!identifier) return "#E80020";
  return (
    TEAM_COLORS[identifier] ??
    TEAM_COLORS_BY_NAME[identifier] ??
    "#E80020"
  );
}
