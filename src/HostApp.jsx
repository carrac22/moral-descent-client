import { useState, useEffect, useCallback } from "react";
import { io } from "socket.io-client";

// ─── CONFIG — Replace with your Railway server URL after deploying ───
const SERVER_URL = process.env.REACT_APP_SERVER_URL || "http://localhost:3001";

const BOARD_SPECIALS = {
  4: 14, 9: 31, 20: 38, 28: 84, 40: 59, 51: 67, 63: 81, 71: 91,
  17: 7, 54: 34, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 99: 78,
};

// ─── QR Code (uses free API, no library needed) ───────────────────────
function QRCode({ value, size = 160 }) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&bgcolor=1a1a2e&color=ffffff&margin=10`;
  return <img src={url} alt="QR Code" style={{ borderRadius: "12px", width: size, height: size }} />;
}

// ─── Board ────────────────────────────────────────────────────────────
function Board({ players }) {
  const playersOnSquare = {};
  players.forEach(p => {
    if (!playersOnSquare[p.position]) playersOnSquare[p.position] = [];
    playersOnSquare[p.position].push(p);
  });

  const squares = [];
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      const num = (9 - row) * 10 + (row % 2 === 0 ? 10 - col : col + 1);
      squares.push(num);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gridTemplateRows: "repeat(10, 1fr)", gap: "2px", width: "100%", aspectRatio: "1", background: "#0d0d1a", borderRadius: "10px", padding: "4px" }}>
      {squares.map(num => {
        const type = BOARD_SPECIALS[num] !== undefined ? (BOARD_SPECIALS[num] > num ? "ladder" : "snake") : "normal";
        const here = playersOnSquare[num] || [];
        return (
          <div key={num} style={{
            position: "relative",
            background: num === 100 ? "linear-gradient(135deg,#f6d365,#fda085)" : type === "ladder" ? "rgba(46,204,113,0.2)" : type === "snake" ? "rgba(231,76,60,0.2)" : num % 2 === 0 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.07)",
            borderRadius: "3px",
            border: num === 100 ? "2px solid #f6d365" : type === "ladder" ? "1px solid rgba(46,204,113,0.4)" : type === "snake" ? "1px solid rgba(231,76,60,0.4)" : "1px solid rgba(255,255,255,0.05)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden",
          }}>
            <span style={{ fontSize: "clamp(5px,0.75vw,9px)", color: num === 100 ? "#1a1a2e" : "rgba(255,255,255,0.35)", fontWeight: "600", lineHeight: 1 }}>{num}</span>
            {type !== "normal" && <span style={{ fontSize: "clamp(6px,0.9vw,11px)", lineHeight: 1 }}>{type === "ladder" ? "🪜" : "🐍"}</span>}
            {here.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "1px" }}>
                {here.map(p => (
                  <div key={p.id} style={{ width: "clamp(7px,1.3vw,16px)", height: "clamp(7px,1.3vw,16px)", borderRadius: "50%", background: p.color, border: "1px solid rgba(255,255,255,0.8)", boxShadow: `0 0 5px ${p.color}` }} title={p.name} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────
export default function HostApp() {
  const [socket, setSocket] = useState(null);
  const [room, setRoom] = useState(null);
  const [hostName, setHostName] = useState("");
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [votedCount, setVotedCount] = useState(0);
  const [notification, setNotification] = useState("");

  // Connect to server
  useEffect(() => {
    const s = io(SERVER_URL, { transports: ["websocket", "polling"] });
    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));
    s.on("game:state", (r) => { setRoom(r); setVotedCount(0); });
    s.on("game:voteUpdate", ({ votedCount }) => setVotedCount(votedCount));
    s.on("room:playerLeft", ({ name }) => showNotification(`${name} left the game`));
    s.on("room:hostLeft", () => { setRoom(null); setError("Disconnected from server."); });
    setSocket(s);
    return () => s.disconnect();
  }, []);

  function showNotification(msg) {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  }

  function handleCreateRoom() {
    if (!hostName.trim()) return setError("Enter your name first.");
    socket.emit("room:create", { hostName: hostName.trim() }, ({ success, room, error }) => {
      if (success) setRoom(room);
      else setError(error);
    });
  }

  function handleStart() {
    socket.emit("game:start", { code: room.code }, ({ success, error }) => {
      if (!success) setError(error);
    });
  }

  function handleStartVoting() {
    socket.emit("game:startVoting", { code: room.code });
  }

  function handleNextRound() {
    socket.emit("game:nextRound", { code: room.code });
  }

  function handleReset() {
    socket.emit("game:reset", { code: room.code });
  }

  const joinUrl = room ? `${window.location.origin.replace(":3000", ":3000")}/join` : "";

  // ── No room yet: setup screen ───────────────────────────────────────
  if (!room) return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Georgia',serif", padding: "20px" }}>
      <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "24px", padding: "48px", maxWidth: "460px", width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: "56px", marginBottom: "12px" }}>⚖️</div>
        <h1 style={{ fontSize: "36px", fontWeight: "900", background: "linear-gradient(135deg,#f6d365,#fda085)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: "0 0 8px" }}>MORAL DESCENT</h1>
        <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: "32px" }}>Host Screen</p>

        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "8px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: connected ? "#2ecc71" : "#e74c3c" }} />
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px" }}>{connected ? "Connected to server" : "Connecting..."}</span>
        </div>

        <input value={hostName} onChange={e => setHostName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCreateRoom()} placeholder="Your name (you play too!)" style={{ width: "100%", padding: "14px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", color: "#fff", fontSize: "16px", outline: "none", fontFamily: "inherit", marginBottom: "16px", boxSizing: "border-box" }} />

        {error && <p style={{ color: "#e74c3c", fontSize: "14px", marginBottom: "12px" }}>{error}</p>}

        <button onClick={handleCreateRoom} disabled={!connected} style={{ width: "100%", padding: "16px", background: connected ? "linear-gradient(135deg,#f6d365,#fda085)" : "rgba(255,255,255,0.1)", border: "none", borderRadius: "14px", color: connected ? "#1a1a2e" : "rgba(255,255,255,0.3)", fontSize: "17px", fontWeight: "800", cursor: connected ? "pointer" : "not-allowed" }}>
          Create Room
        </button>
      </div>
    </div>
  );

  // ── Lobby ───────────────────────────────────────────────────────────
  if (room.phase === "LOBBY") return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f0c29,#1a1a2e)", display: "flex", fontFamily: "'Georgia',serif", color: "#fff", padding: "32px", gap: "32px", alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: "16px" }}>Players scan to join</div>
        <QRCode value={`${window.location.href.replace("/host","")}/join?code=${room.code}`} size={200} />
        <div style={{ marginTop: "16px", fontSize: "14px", color: "rgba(255,255,255,0.5)" }}>or go to <strong style={{ color: "#f6d365" }}>{window.location.host}/join</strong></div>
      </div>

      <div style={{ minWidth: "280px" }}>
        <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px" }}>Room Code</div>
        <div style={{ fontSize: "72px", fontWeight: "900", letterSpacing: "12px", background: "linear-gradient(135deg,#f6d365,#fda085)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1, marginBottom: "32px" }}>{room.code}</div>

        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "12px" }}>Players ({room.players.length}/8)</div>
          {room.players.map(p => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: p.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px" }}>{p.emoji}</div>
              <span style={{ color: "#fff", fontWeight: "600" }}>{p.name}</span>
              {p.isHost && <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.08)", padding: "2px 8px", borderRadius: "4px" }}>HOST</span>}
            </div>
          ))}
        </div>

        {notification && <div style={{ padding: "10px 16px", background: "rgba(255,193,7,0.15)", border: "1px solid rgba(255,193,7,0.3)", borderRadius: "8px", color: "#ffc107", fontSize: "13px", marginBottom: "16px" }}>{notification}</div>}

        <button onClick={handleStart} disabled={room.players.length < 2} style={{ width: "100%", padding: "16px", background: room.players.length >= 2 ? "linear-gradient(135deg,#f6d365,#fda085)" : "rgba(255,255,255,0.1)", border: "none", borderRadius: "14px", color: room.players.length >= 2 ? "#1a1a2e" : "rgba(255,255,255,0.3)", fontSize: "17px", fontWeight: "800", cursor: room.players.length >= 2 ? "pointer" : "not-allowed" }}>
          {room.players.length < 2 ? "Waiting for players..." : "Start Game →"}
        </button>
      </div>
    </div>
  );

  // ── Game Over ───────────────────────────────────────────────────────
  if (room.phase === "GAME_OVER") return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at center,rgba(246,211,101,0.15),#0f0c29)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Georgia',serif", padding: "20px" }}>
      <div style={{ textAlign: "center", maxWidth: "520px", width: "100%" }}>
        <div style={{ fontSize: "80px", marginBottom: "16px" }}>🏆</div>
        <h1 style={{ fontSize: "52px", fontWeight: "900", background: "linear-gradient(135deg,#f6d365,#fda085)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "8px" }}>{room.winner?.name} Wins!</h1>
        <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: "40px" }}>Survived the moral descent and reached square 100.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "40px" }}>
          {[...room.players].sort((a, b) => b.position - a.position).map((p, i) => (
            <div key={p.id} style={{ background: p.id === room.winner?.id ? "rgba(246,211,101,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${p.id === room.winner?.id ? "#f6d365" : "rgba(255,255,255,0.08)"}`, borderRadius: "12px", padding: "12px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ color: "rgba(255,255,255,0.4)", width: "28px" }}>{["🥇","🥈","🥉"][i] || `#${i+1}`}</span>
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: p.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>{p.emoji}</div>
              <span style={{ flex: 1, color: "#fff", fontWeight: "600", textAlign: "left" }}>{p.name}</span>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>Square {p.position}</span>
            </div>
          ))}
        </div>
        <button onClick={handleReset} style={{ padding: "16px 48px", background: "linear-gradient(135deg,#f6d365,#fda085)", border: "none", borderRadius: "14px", color: "#1a1a2e", fontSize: "17px", fontWeight: "800", cursor: "pointer" }}>Play Again</button>
      </div>
    </div>
  );

  // ── Main game screen ────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f0c29,#1a1a2e)", display: "flex", fontFamily: "'Georgia',serif", color: "#fff", padding: "16px", gap: "16px" }}>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}`}</style>

      {notification && (
        <div style={{ position: "fixed", top: "20px", right: "20px", padding: "12px 20px", background: "rgba(255,193,7,0.15)", border: "1px solid rgba(255,193,7,0.4)", borderRadius: "10px", color: "#ffc107", fontSize: "14px", zIndex: 999 }}>{notification}</div>
      )}

      {/* Board column */}
      <div style={{ flex: "1 1 400px", minWidth: "300px", maxWidth: "560px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <span style={{ fontWeight: "900", fontSize: "18px", background: "linear-gradient(135deg,#f6d365,#fda085)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>⚖️ MORAL DESCENT</span>
          <span style={{ background: "rgba(255,255,255,0.07)", borderRadius: "50px", padding: "4px 14px", fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>Round {room.round || 1}</span>
        </div>
        <Board players={room.players} />
        <div style={{ display: "flex", gap: "16px", marginTop: "8px", justifyContent: "center" }}>
          {[["🪜","Ladder"],["🐍","Snake"],["🏆","Win at 100"]].map(([icon, label]) => (
            <span key={label} style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", gap: "4px" }}>{icon} {label}</span>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <div style={{ flex: "1 1 220px", minWidth: "180px", display: "flex", flexDirection: "column", gap: "12px" }}>

        {/* Room code (compact) */}
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", letterSpacing: "2px", textTransform: "uppercase" }}>Room Code</div>
            <div style={{ fontSize: "24px", fontWeight: "900", letterSpacing: "4px", color: "#f6d365" }}>{room.code}</div>
          </div>
          <QRCode value={`${window.location.href.replace("/host","")}/join?code=${room.code}`} size={60} />
        </div>

        {/* Active theme */}
        {room.activeTheme && (
          <div style={{ background: `${room.activeTheme.color}22`, border: `1px solid ${room.activeTheme.color}55`, borderRadius: "14px", padding: "14px" }}>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "6px" }}>Active Theme</div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <span style={{ fontSize: "20px" }}>{room.activeTheme.emoji}</span>
              <span style={{ fontWeight: "700", fontSize: "14px" }}>{room.activeTheme.name}</span>
            </div>
            {["majority","minority","tiebreaker"].map(k => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                <span style={{ color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px" }}>{k === "majority" ? "✅" : k === "minority" ? "❌" : "⚖️"} {k}</span>
                <span style={{ color: "#fff", fontWeight: "600" }}>{room.activeTheme[k].label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Dilemma + voting */}
        {room.activeDilemma && room.phase === "VOTING" && (
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", padding: "14px" }}>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px" }}>Current Dilemma</div>
            <p style={{ color: "#fff", fontSize: "13px", lineHeight: 1.5, marginBottom: "12px" }}>{room.activeDilemma.question}</p>
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <div style={{ flex: 1, background: "rgba(46,204,113,0.1)", border: "1px solid rgba(46,204,113,0.3)", borderRadius: "8px", padding: "6px 10px", textAlign: "center", fontSize: "12px", color: "#2ecc71" }}>✓ {room.activeDilemma.yesLabel}</div>
              <div style={{ flex: 1, background: "rgba(231,76,60,0.1)", border: "1px solid rgba(231,76,60,0.3)", borderRadius: "8px", padding: "6px 10px", textAlign: "center", fontSize: "12px", color: "#e74c3c" }}>✗ {room.activeDilemma.noLabel}</div>
            </div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", marginBottom: "8px", textAlign: "center" }}>
              {votedCount}/{room.players.length} voted
            </div>
            <div style={{ height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(votedCount / room.players.length) * 100}%`, background: room.activeTheme?.color || "#f6d365", transition: "width 0.3s", borderRadius: "2px" }} />
            </div>
          </div>
        )}

        {/* Theme reveal CTA */}
        {room.phase === "THEME_REVEAL" && (
          <button onClick={handleStartVoting} style={{ padding: "14px", background: room.activeTheme?.color || "#f6d365", border: "none", borderRadius: "12px", color: "#fff", fontSize: "15px", fontWeight: "700", cursor: "pointer", animation: "pulse 1.5s ease infinite" }}>
            {room.activeTheme?.emoji} Start Voting →
          </button>
        )}

        {/* Results CTA */}
        {room.phase === "RESULTS" && (
          <div>
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "14px", marginBottom: "12px" }}>
              <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "10px" }}>Round Results</div>
              {room.lastMovements?.map(mov => {
                const p = room.players.find(pl => pl.id === mov.playerId);
                if (!p) return null;
                return (
                  <div key={mov.playerId} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: p.color, fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{p.emoji}</div>
                    <span style={{ flex: 1, fontSize: "13px", color: "#fff" }}>{p.name}</span>
                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{mov.from}→{mov.to}</span>
                    <span style={{ fontWeight: "800", fontSize: "14px", color: mov.to >= mov.from ? "#2ecc71" : "#e74c3c" }}>{mov.delta >= 0 ? "+" : ""}{mov.delta}</span>
                    {mov.special && <span>{mov.special === "ladder" ? "🪜" : "🐍"}</span>}
                  </div>
                );
              })}
            </div>
            <button onClick={handleNextRound} style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg,#f6d365,#fda085)", border: "none", borderRadius: "12px", color: "#1a1a2e", fontSize: "16px", fontWeight: "800", cursor: "pointer" }}>
              Next Round →
            </button>
          </div>
        )}

        {/* Leaderboard */}
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "14px", flex: 1 }}>
          <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "12px" }}>Leaderboard</div>
          {[...room.players].sort((a, b) => b.position - a.position).map((p, i) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px", width: "14px" }}>{i + 1}</span>
              <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: p.color, flexShrink: 0, fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>{p.emoji}</div>
              <span style={{ flex: 1, color: "#fff", fontSize: "13px", fontWeight: "600" }}>{p.name}</span>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#f6d365", fontSize: "13px", fontWeight: "700" }}>{p.position}</div>
                <div style={{ height: "2px", width: `${(p.position / 100) * 50}px`, background: p.color, borderRadius: "2px", marginLeft: "auto", minWidth: p.position > 0 ? "3px" : "0", transition: "width 0.5s ease" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
