"use client";

import { useState } from "react";

export default function AdminInsertPick() {
  const [secret, setSecret] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit() {
    setStatus("loading");
    try {
      const res = await fetch("/api/admin/insert-pick", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret,
        },
        body: JSON.stringify({
          email: "lattanzi.joseph@gmail.com",
          driverName: "Charles",
          constructorName: "Aston Martin",
          raceCountry: "Austria",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage(data.message);
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong");
      }
    } catch {
      setStatus("error");
      setMessage("Network error");
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a", padding: "1rem" }}>
      <div style={{ background: "#1a1a1a", borderRadius: "12px", padding: "2rem", maxWidth: "400px", width: "100%", color: "#fff" }}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Admin: Insert Pick</h1>
        <p style={{ color: "#888", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
          Charles Leclerc + Aston Martin — Austria GP
        </p>

        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", color: "#aaa" }}>
          Admin Secret
        </label>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Enter your CRON_SECRET"
          style={{
            width: "100%", padding: "0.75rem", borderRadius: "8px",
            border: "1px solid #333", background: "#111", color: "#fff",
            fontSize: "1rem", marginBottom: "1.5rem", boxSizing: "border-box",
          }}
        />

        <button
          onClick={handleSubmit}
          disabled={status === "loading" || !secret}
          style={{
            width: "100%", padding: "0.875rem", borderRadius: "8px",
            background: status === "success" ? "#16a34a" : "#e10600",
            color: "#fff", fontSize: "1.1rem", fontWeight: 600,
            border: "none", cursor: status === "loading" ? "wait" : "pointer",
            opacity: !secret ? 0.5 : 1,
          }}
        >
          {status === "loading" ? "Submitting..." : status === "success" ? "Done!" : "Submit Pick"}
        </button>

        {message && (
          <p style={{
            marginTop: "1rem", padding: "0.75rem", borderRadius: "8px",
            background: status === "success" ? "#16a34a22" : "#e1060022",
            color: status === "success" ? "#4ade80" : "#f87171",
            fontSize: "0.9rem",
          }}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
