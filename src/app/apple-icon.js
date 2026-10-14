import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS home-screen icon. Kept in code so it tracks the brand colours without a
// separate binary asset to maintain.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #2563eb, #1d4ed8)",
        }}
      >
        <div
          style={{
            width: 104,
            height: 80,
            background: "#ffffff",
            borderRadius: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingRight: 18,
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 22,
              background: "#1d4ed8",
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
