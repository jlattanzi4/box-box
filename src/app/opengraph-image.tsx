import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// The card shown when a link to Box Box is pasted into a chat: the start
// gantry with all five lights on, the name, and the game in one line.

export const alt = "Box Box: fantasy F1 for your group chat";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ASPHALT = "#101216";
const ASPHALT_DEEP = "#0a0b0d";
const LINE = "#2b303a";
const CHALK = "#f3f1ec";
const CHALK_DIM = "#9a9ea8";
const KERB_RED = "#e8002d";

const font = (file: string) => readFile(join(process.cwd(), "assets/fonts", file));

export default async function OpenGraphImage() {
  const [extraBold, medium] = await Promise.all([
    font("BarlowCondensed-ExtraBold.ttf"),
    font("BarlowCondensed-Medium.ttf"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: ASPHALT,
          color: CHALK,
          fontFamily: "Barlow Condensed",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "64px 72px 0" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 30, fontWeight: 500, letterSpacing: 6, color: CHALK_DIM }}>
              FANTASY F1 · 2026 SEASON
            </div>
            <div style={{ display: "flex", fontSize: 250, fontWeight: 800, lineHeight: 0.92, letterSpacing: -4, marginTop: 28 }}>
              <span>BOX</span>
              <span style={{ color: KERB_RED, marginLeft: 44 }}>BOX</span>
            </div>
          </div>

          {/* The start gantry: five columns of two lights, all lit. */}
          <div
            style={{
              display: "flex",
              gap: 16,
              padding: 20,
              marginTop: 8,
              borderRadius: 18,
              border: `2px solid ${LINE}`,
              background: ASPHALT_DEEP,
            }}
          >
            {[0, 1, 2, 3, 4].map((column) => (
              <div key={column} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[0, 1].map((row) => (
                  <div
                    key={row}
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 23,
                      background: KERB_RED,
                      boxShadow: `0 0 28px ${KERB_RED}`,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", padding: "0 72px 44px", fontSize: 46, fontWeight: 500, color: CHALK }}>
            One pick a race. Every driver once. Scored from the real results.
          </div>
          {/* A kerb along the bottom edge. */}
          <div style={{ display: "flex", height: 28 }}>
            {Array.from({ length: 24 }, (_, i) => (
              <div key={i} style={{ flex: 1, background: i % 2 === 0 ? KERB_RED : CHALK }} />
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Barlow Condensed", data: extraBold, weight: 800, style: "normal" },
        { name: "Barlow Condensed", data: medium, weight: 500, style: "normal" },
      ],
    }
  );
}
