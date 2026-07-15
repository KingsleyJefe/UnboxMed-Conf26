import { ImageResponse } from "next/og";

export const alt = "Beyond the Syllabus — UnboxMed Conference 2026";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        color: "white",
        background: "linear-gradient(135deg, #e0552a 0%, #9d2a0f 55%, #431000 100%)",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", fontSize: 26, fontWeight: 700 }}>UnboxMed Conference 2026</div>
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 900 }}>
        <div style={{ display: "flex", fontSize: 104, fontWeight: 800, lineHeight: 0.92, letterSpacing: "-6px" }}>
          Beyond the Syllabus
        </div>
        <div style={{ display: "flex", marginTop: 34, color: "#ffc9b8", fontSize: 30 }}>
          15 August 2026 · Cine 21, Aba
        </div>
      </div>
    </div>,
    size,
  );
}
