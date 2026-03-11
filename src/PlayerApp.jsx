import { useState, useEffect } from "react";
import { io } from "socket.io-client";

const SERVER_URL = process.env.REACT_APP_SERVER_URL || "http://localhost:3001";

export default function PlayerApp() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [screen, setScreen] = useState("join"); // join | waiting | theme | voting | voted | results | gameover
  const [room, setRoom] = useState(null);
  const [myPlayer, setMyPlayer] = useState(null);
  const [code, setCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [error, setError] = useState("");
  const [myVote, setMyVote] = useState(null);
  const [votedCount, setVotedCount] = useState(0);
  const [notification, setNotification] = useState("");

  // Auto-fill code from URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("code");
    if (c) setCode(c.toUpperCase());
  }, []);

  useEffect(() => {
    const s = io(SERVER_URL, { transports: ["websocket", "polling"] });
    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));

    s.on("game:state", (r) => {
      setRoom(r);
      setVotedCount(0);
      // Map phase to screen
      if (r.phase === "LOBBY") setScreen("waiting");
      else if (r.phase === "THEME_REVEAL") { setScreen("theme"); setMyVote(null); }
      else if (r.phase === "VOTING") { setScreen("voting"); setMyVote(null); }
      else if (r.phase === "RESULTS") setScreen("results");
      else if (r.phase === "GAME_OVER") setScreen("gameover");
    });

    s.on("game:voteUpdate", ({ votedCount }) => setVotedCount(votedCount));
    s.on("room:hostLeft", () => { setScreen("join"); setError("The host ended the game."); setRoom(null); });

    setSocket(s);
    return () => s.disconnect();
  }, []);

  function handleJoin() {
    if (!code.trim() || !playerName.trim()) return setError("Enter both a room code and your name.");
    setError("");
    socket.emit("room:join", { code: code.trim().toUpperCase(), playerName: playerName.trim() }, ({ success, player, room, error }) => {
      if (success) {
        setMyPlayer(player);
        setRoom(room);
        setScreen("waiting");
      } else {
        setError(error);
      }
    });
  }

  function handleVote(vote) {
    if (myVote) return; // already voted
    setMyVote(vote);
    setScreen("voted");
    socket.emit("game:vote", { code: room.code, vote });
  }

  // ── Join screen ──────────────────────────────────────────────────────
  if (screen === "join") return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ fontSize: "52px", marginBottom: "12px" }}>⚖️</div>
        <h1 style={styles.title}>MORAL DESCENT</h1>
        <p style={styles.subtitle}>Enter the room code shown on the host screen</p>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center", marginBottom: "24px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: connected ? "#2ecc71" : "#e74c3c" }} />
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px" }}>{connected ? "Connected" : "Connecting..."}</span>
        </div>

        <input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase().slice(0, 4))}
          placeholder="ROOM CODE"
          maxLength={4}
          style={{ ...styles.input, fontSize: "32px", letterSpacing: "8px", textAlign: "center", fontWeight: "900", marginBottom: "12px" }}
        />
        <input
          value={playerName}
          onChange={e => setPlayerName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleJoin()}
          placeholder="Your name"
          maxLength={20}
          style={{ ...styles.input, marginBottom: "16px" }}
        />

        {error && <p style={{ color: "#e74c3c", fontSize: "14px", marginBottom: "12px", textAlign: "center" }}>{error}</p>}

        <button onClick={handleJoin} disabled={!connected} style={{ ...styles.btn, background: connected ? "linear-gradient(135deg,#f6d365,#fda085)" : "rgba(255,255,255,0.1)", color: connected ? "#1a1a2e" : "rgba(255,255,255,0.3)", cursor: connected ? "pointer" : "not-allowed" }}>
          Join Game
        </button>
      </div>
    </div>
  );

  // ── Waiting in lobby ─────────────────────────────────────────────────
  if (screen === "waiting") return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ fontSize: "48px", marginBottom: "16px", animation: "spin 4s linear infinite" }}>⏳</div>
        <h2 style={styles.title}>Waiting for host...</h2>
        <p style={styles.subtitle}>Room <strong style={{ color: "#f6d365" }}>{room?.code}</strong></p>
        <div style={{ marginTop: "24px" }}>
          <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "12px" }}>Players joined</div>
          {room?.players.map(p => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", justifyContent: "center" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: p.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px" }}>{p.emoji}</div>
              <span style={{ color: "#fff", fontWeight: p.id === myPlayer?.id ? "800" : "400", fontSize: "15px" }}>
                {p.name} {p.id === myPlayer?.id ? "(you)" : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Theme reveal ──────────────────────────────────────────────────────
  if (screen === "theme" && room?.activeTheme) return (
    <div style={styles.page}>
      <div style={{ ...styles.card, border: `2px solid ${room.activeTheme.color}` }}>
        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: "12px" }}>Theme Card</div>
        <div style={{ fontSize: "64px", marginBottom: "12px" }}>{room.activeTheme.emoji}</div>
        <h2 style={{ ...styles.title, WebkitTextFillColor: room.activeTheme.color }}>{room.activeTheme.name}</h2>
        <p style={styles.subtitle}>{room.activeTheme.description}</p>

        <div style={{ marginTop: "20px", textAlign: "left", background: "rgba(0,0,0,0.2)", borderRadius: "12px", padding: "16px" }}>
          {["majority","minority","tiebreaker"].map(k => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: k !== "tiebreaker" ? "10px" : 0, fontSize: "13px" }}>
              <span style={{ color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px" }}>
                {k === "majority" ? "✅ Win" : k === "minority" ? "❌ Lose" : "⚖️ Tie"}
              </span>
              <span style={{ color: "#fff", fontWeight: "600" }}>{room.activeTheme[k].label}</span>
            </div>
          ))}
        </div>

        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px", marginTop: "20px" }}>Waiting for host to start voting...</p>
      </div>
    </div>
  );

  // ── Voting ────────────────────────────────────────────────────────────
  if (screen === "voting" && room?.activeDilemma) return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ display: "inline-block", background: `${room.activeTheme?.color}33`, border: `1px solid ${room.activeTheme?.color}66`, borderRadius: "50px", padding: "4px 14px", color: room.activeTheme?.color, fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "20px" }}>
          {room.activeDilemma.category}
        </div>

        <p style={{ color: "#fff", fontSize: "18px", fontWeight: "700", lineHeight: 1.6, marginBottom: "32px", textAlign: "center" }}>
          {room.activeDilemma.question}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%" }}>
          <button
            onClick={() => handleVote("yes")}
            style={{
              padding: "22px", background: "rgba(46,204,113,0.12)", border: "3px solid rgba(46,204,113,0.5)",
              borderRadius: "16px", color: "#2ecc71", fontSize: "18px", fontWeight: "800",
              cursor: "pointer", transition: "all 0.15s", letterSpacing: "0.5px",
            }}
          >
            ✓ {room.activeDilemma.yesLabel}
          </button>
          <button
            onClick={() => handleVote("no")}
            style={{
              padding: "22px", background: "rgba(231,76,60,0.12)", border: "3px solid rgba(231,76,60,0.5)",
              borderRadius: "16px", color: "#e74c3c", fontSize: "18px", fontWeight: "800",
              cursor: "pointer", transition: "all 0.15s", letterSpacing: "0.5px",
            }}
          >
            ✗ {room.activeDilemma.noLabel}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Voted — waiting for others ────────────────────────────────────────
  if (screen === "voted") return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ fontSize: "56px", marginBottom: "16px" }}>
          {myVote === "yes" ? "✅" : "❌"}
        </div>
        <h2 style={styles.title}>Vote locked in!</h2>
        <p style={styles.subtitle}>
          You chose: <strong style={{ color: myVote === "yes" ? "#2ecc71" : "#e74c3c" }}>
            {myVote === "yes" ? room?.activeDilemma?.yesLabel : room?.activeDilemma?.noLabel}
          </strong>
        </p>
        <div style={{ marginTop: "24px", color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>
          {votedCount}/{room?.players?.length} players voted
        </div>
        <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", marginTop: "10px", overflow: "hidden" }}>
          <div style={{ width: `${((votedCount || 0) / (room?.players?.length || 1)) * 100}%`, height: "100%", background: room?.activeTheme?.color || "#f6d365", transition: "width 0.3s", borderRadius: "2px" }} />
        </div>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px", marginTop: "16px" }}>Waiting for results...</p>
      </div>
    </div>
  );

  // ── Results ───────────────────────────────────────────────────────────
  if (screen === "results") {
    const me = room?.players?.find(p => p.id === myPlayer?.id);
    const myMov = room?.lastMovements?.find(m => m.playerId === myPlayer?.id);
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>📊</div>
          <h2 style={styles.title}>Results</h2>

          {myMov && (
            <div style={{ background: myMov.to >= myMov.from ? "rgba(46,204,113,0.1)" : "rgba(231,76,60,0.1)", border: `2px solid ${myMov.to >= myMov.from ? "#2ecc71" : "#e74c3c"}`, borderRadius: "16px", padding: "20px", marginBottom: "20px", width: "100%" }}>
              <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginBottom: "6px" }}>Your result</div>
              <div style={{ fontSize: "36px", fontWeight: "900", color: myMov.to >= myMov.from ? "#2ecc71" : "#e74c3c" }}>
                {myMov.delta >= 0 ? "+" : ""}{myMov.delta} spaces
              </div>
              <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>
                Square {myMov.from} → <strong style={{ color: "#fff" }}>{myMov.to}</strong>
                {myMov.special === "ladder" && " 🪜 You hit a ladder!"}
                {myMov.special === "snake" && " 🐍 You hit a snake!"}
              </div>
            </div>
          )}

          <div style={{ width: "100%", textAlign: "left" }}>
            {[...room.players].sort((a, b) => b.position - a.position).map((p, i) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", opacity: p.id === myPlayer?.id ? 1 : 0.6 }}>
                <span style={{ color: "rgba(255,255,255,0.3)", width: "16px", fontSize: "12px" }}>{i + 1}</span>
                <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: p.color, fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>{p.emoji}</div>
                <span style={{ flex: 1, color: "#fff", fontSize: "13px", fontWeight: p.id === myPlayer?.id ? "800" : "400" }}>{p.name} {p.id === myPlayer?.id ? "(you)" : ""}</span>
                <span style={{ color: "#f6d365", fontWeight: "700" }}>{p.position}</span>
              </div>
            ))}
          </div>

          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px", marginTop: "20px" }}>Waiting for host to start next round...</p>
        </div>
      </div>
    );
  }

  // ── Game over ──────────────────────────────────────────────────────────
  if (screen === "gameover") {
    const iWon = room?.winner?.id === myPlayer?.id;
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ fontSize: "72px", marginBottom: "16px" }}>{iWon ? "🏆" : "💀"}</div>
          <h2 style={{ ...styles.title, WebkitTextFillColor: iWon ? "#f6d365" : "#e74c3c" }}>
            {iWon ? "You Win!" : `${room?.winner?.name} Wins!`}
          </h2>
          <p style={styles.subtitle}>{iWon ? "You survived the moral descent!" : "Better luck next time."}</p>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px", marginTop: "24px" }}>Waiting for host to start a new game...</p>
        </div>
      </div>
    );
  }

  return <div style={styles.page}><div style={styles.card}><p style={{ color: "#fff" }}>Connecting...</p></div></div>;
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg,#0f0c29,#1a1a2e)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Georgia',serif",
    color: "#fff",
    padding: "20px",
  },
  card: {
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "24px",
    padding: "36px 28px",
    width: "100%",
    maxWidth: "400px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },
  title: {
    fontSize: "28px",
    fontWeight: "900",
    background: "linear-gradient(135deg,#f6d365,#fda085)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    margin: "0 0 8px",
  },
  subtitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: "15px",
    margin: "0 0 8px",
    lineHeight: 1.5,
  },
  input: {
    width: "100%",
    padding: "14px",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "12px",
    color: "#fff",
    fontSize: "16px",
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  btn: {
    width: "100%",
    padding: "16px",
    border: "none",
    borderRadius: "14px",
    fontSize: "17px",
    fontWeight: "800",
  },
};
