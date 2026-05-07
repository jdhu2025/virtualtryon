import { ImageResponse } from "next/og";

export const alt = "AI Outfit Assistant virtual wardrobe styling preview";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background:
            "radial-gradient(circle at 20% 25%, #06b6d4 0, transparent 28%), radial-gradient(circle at 80% 30%, #f97316 0, transparent 24%), linear-gradient(135deg, #020617 0%, #164e63 52%, #111827 100%)",
          color: "white",
          display: "flex",
          fontFamily: "Inter, Arial, sans-serif",
          height: "100%",
          justifyContent: "center",
          padding: "72px",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "28px",
            width: "100%",
          }}
        >
          <div style={{ fontSize: 32, opacity: 0.82 }}>
            AI Outfit Assistant
          </div>
          <div
            style={{
              fontSize: 88,
              fontWeight: 800,
              letterSpacing: "-2px",
              lineHeight: 0.96,
              maxWidth: 880,
            }}
          >
            Dress what you already own
          </div>
          <div style={{ color: "#bae6fd", fontSize: 34, maxWidth: 760 }}>
            Daily AI styling, wardrobe memory, and virtual try-on support.
          </div>
        </div>
      </div>
    ),
    size
  );
}
