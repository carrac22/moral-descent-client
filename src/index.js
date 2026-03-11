// ═══════════════════════════════════════════════════════════════════
// MORAL DESCENT — Game Server
// Node.js + Socket.io | Deploy to Railway
// ═══════════════════════════════════════════════════════════════════

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

// ─── CORS: allow your deployed Railway domain + local dev ────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["*"];

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ["GET", "POST"] },
});

// ─── Health check (Railway uses this) ───────────────────────────────
app.get("/health", (req, res) => res.json({ status: "ok", rooms: rooms.size }));
app.get("/", (req, res) => res.json({ game: "Moral Descent Server", version: "1.0.0" }));

// ═══════════════════════════════════════════════════════════════════
// GAME DATA — Edit these arrays to customize cards
// ═══════════════════════════════════════════════════════════════════

const THEME_CARDS = [
  { id: "survival", name: "Survival of the Fittest", emoji: "🦁", color: "#c0392b",
    description: "Only the strong survive. Majority rules.",
    majority: { type: "move", spaces: 2, label: "Majority advances +2 spaces" },
    minority: { type: "move", spaces: -3, label: "Minority falls back 3 spaces" },
    tiebreaker: { type: "move", spaces: 1, label: "Tie: everyone moves up 1" } },

  { id: "democracy", name: "True Democracy", emoji: "🗳️", color: "#2980b9",
    description: "Every voice matters. Majority shapes the world.",
    majority: { type: "move", spaces: 1, label: "Majority advances +1 space" },
    minority: { type: "move", spaces: -1, label: "Minority retreats 1 space" },
    tiebreaker: { type: "move", spaces: 0, label: "Tie: no movement" } },

  { id: "chaos", name: "Chaos Reigns", emoji: "🎲", color: "#8e44ad",
    description: "Nothing is fair. Random chaos decides fate.",
    majority: { type: "random", min: -3, max: 3, label: "Majority moves randomly (-3 to +3)" },
    minority: { type: "random", min: -4, max: 2, label: "Minority moves randomly (-4 to +2)" },
    tiebreaker: { type: "random", min: -2, max: 4, label: "Tie: everyone moves randomly" } },

  { id: "collectivism", name: "The Collective", emoji: "🤝", color: "#27ae60",
    description: "Together we rise or fall. The group is one.",
    majority: { type: "move", spaces: 2, label: "Majority advances +2 spaces" },
    minority: { type: "move", spaces: 2, label: "Minority ALSO advances +2 — solidarity!" },
    tiebreaker: { type: "move", spaces: 3, label: "Tie: everyone leaps forward 3!" } },

  { id: "betrayal", name: "Age of Betrayal", emoji: "🗡️", color: "#d35400",
    description: "The minority outsmarts the crowd.",
    majority: { type: "move", spaces: -2, label: "Majority is punished — back 2 spaces" },
    minority: { type: "move", spaces: 3, label: "Minority is rewarded — forward 3 spaces!" },
    tiebreaker: { type: "move", spaces: -1, label: "Tie: everyone loses 1 space" } },

  { id: "inquisition", name: "The Inquisition", emoji: "⚖️", color: "#7f8c8d",
    description: "YES is the only safe answer.",
    majority: { type: "conditional", yesMove: 2, noMove: -4, label: "YES voters +2 | NO voters -4" },
    minority: { type: "conditional", yesMove: 1, noMove: -2, label: "YES voters +1 | NO voters -2" },
    tiebreaker: { type: "move", spaces: 0, label: "Tie: no movement" } },
];

const DILEMMA_CARDS = [
  { id: "trolley", category: "Classic Morality", question: "You can pull a lever to divert a runaway trolley — killing 1 person instead of 5. Do you pull it?", yesLabel: "Pull the lever", noLabel: "Do nothing" },
  { id: "lifeboat", category: "Classic Morality", question: "A lifeboat holds 6 but 10 survivors need saving. Do you take charge and choose who stays?", yesLabel: "Take charge", noLabel: "Refuse to choose" },
  { id: "steal_bread", category: "Classic Morality", question: "A family is starving with no money. Is it ethical to steal bread to feed them?", yesLabel: "Yes, steal it", noLabel: "No, it's still wrong" },
  { id: "white_lie", category: "Social", question: "Your friend invested their savings in a terrible business plan. Do you tell them the brutal truth?", yesLabel: "Tell the truth", noLabel: "Support them anyway" },
  { id: "whistle", category: "Social", question: "Your company is illegally dumping chemicals. Whistleblowing costs everyone their jobs. Do you report it?", yesLabel: "Report it", noLabel: "Stay silent" },
  { id: "cheat_exam", category: "Social", question: "A classmate is cheating on a curve-graded exam — hurting your grade. Do you report them?", yesLabel: "Report them", noLabel: "Let it go" },
  { id: "simulation", category: "Philosophy", question: "Reality is a simulation. Exiting erases all memories and relationships. Do you exit?", yesLabel: "Exit", noLabel: "Stay" },
  { id: "memory_erase", category: "Philosophy", question: "A pill erases your most painful memory — but also removes everything you learned from it. Take it?", yesLabel: "Take the pill", noLabel: "Keep the memory" },
  { id: "immortality", category: "Philosophy", question: "You're offered immortality, but everyone you love ages and dies normally. Accept?", yesLabel: "Accept immortality", noLabel: "Decline" },
  { id: "sacrifice", category: "Survival", question: "A group member is bitten and will turn in 12 hours. Do you end their life now to protect the group?", yesLabel: "End their life", noLabel: "Let them choose" },
  { id: "resources", category: "Survival", question: "Supplies for your 5-person group for 1 month, or 10 strangers for 2 weeks. Do you share?", yesLabel: "Share with strangers", noLabel: "Keep for your group" },
  { id: "surveillance", category: "Politics", question: "AI cameras cut crime 70% but eliminate privacy. Do you support this law?", yesLabel: "Support surveillance", noLabel: "Oppose it" },
  { id: "self_driving", category: "Technology", question: "A self-driving car must choose: hit 1 elderly person or swerve to hit 3 children. Should age factor in programming?", yesLabel: "Yes, age should factor in", noLabel: "No, all lives are equal" },
  { id: "social_media", category: "Technology", question: "You have proof a public figure committed a minor crime years ago. Posting will destroy their career. Do you post it?", yesLabel: "Post it", noLabel: "Keep it private" },
];

const BOARD_SPECIALS = {
  4: 14, 9: 31, 20: 38, 28: 84, 40: 59, 51: 67, 63: 81, 71: 91,
  17: 7, 54: 34, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 99: 78,
};

const PLAYER_COLORS = ["#e74c3c","#3498db","#2ecc71","#f39c12","#9b59b6","#1abc9c","#e67e22","#e91e63"];
const PLAYER_EMOJIS = ["🔴","🔵","🟢","🟡","🟣","🩵","🟠","🩷"];
const VOTE_TIMER = 30;

// ═══════════════════════════════════════════════════════════════════
// ROOM MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

// rooms: Map<roomCode, RoomState>
const rooms = new Map();

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O,0,I,1 — hard to confuse
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function createRoom(hostSocketId, hostName) {
  const code = generateRoomCode();
  const room = {
    code,
    hostSocketId,
    phase: "LOBBY",               // LOBBY | THEME_REVEAL | VOTING | RESULTS | GAME_OVER
    players: [{
      id: hostSocketId,
      name: hostName || "Host",
      position: 0,
      color: PLAYER_COLORS[0],
      emoji: PLAYER_EMOJIS[0],
      isHost: true,
    }],
    themeDeck: shuffle([...THEME_CARDS]),
    dilemmaPool: shuffle([...DILEMMA_CARDS]),
    activeTheme: null,
    activeDilemma: null,
    currentVotes: {},             // { socketId: "yes" | "no" }
    lastMovements: [],
    roundHistory: [],
    round: 0,
    winner: null,
    voteTimer: null,
    timerStartedAt: null,
  };
  rooms.set(code, room);
  return room;
}

// ─── Utility ─────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function rng(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function safeRoom(room) {
  // Strip internal socket references before broadcasting
  const { voteTimer, ...safe } = room;
  return safe;
}

// ─── Game Logic ──────────────────────────────────────────────────────

function resolveVotes(room) {
  const { currentVotes, players, activeTheme } = room;

  // Fill abstentions with "no"
  const filledVotes = { ...currentVotes };
  players.forEach(p => { if (!filledVotes[p.id]) filledVotes[p.id] = "no"; });

  const yesIds = players.filter(p => filledVotes[p.id] === "yes").map(p => p.id);
  const noIds  = players.filter(p => filledVotes[p.id] === "no").map(p => p.id);
  const isTie  = yesIds.length === noIds.length;
  const majorityIds = isTie ? [] : (yesIds.length > noIds.length ? yesIds : noIds);
  const minorityIds = isTie ? [] : (yesIds.length > noIds.length ? noIds : yesIds);

  const movements = players.map(player => {
    const vote = filledVotes[player.id];
    let delta = 0;
    const majRule = activeTheme.majority;

    if (majRule.type === "conditional") {
      const isMaj = majorityIds.includes(player.id);
      const rule = isMaj ? activeTheme.majority : activeTheme.minority;
      delta = vote === "yes" ? rule.yesMove : rule.noMove;
    } else if (isTie) {
      const t = activeTheme.tiebreaker;
      delta = t.type === "random" ? rng(t.min, t.max) : t.spaces;
    } else if (majorityIds.includes(player.id)) {
      delta = majRule.type === "random" ? rng(majRule.min, majRule.max) : majRule.spaces;
    } else {
      const minRule = activeTheme.minority;
      delta = minRule.type === "random" ? rng(minRule.min, minRule.max) : minRule.spaces;
    }

    const rawDest = clamp(player.position + delta, 0, 100);
    const special = BOARD_SPECIALS[rawDest] !== undefined
      ? (BOARD_SPECIALS[rawDest] > rawDest ? "ladder" : "snake") : null;
    const finalDest = BOARD_SPECIALS[rawDest] !== undefined ? BOARD_SPECIALS[rawDest] : rawDest;

    return {
      playerId: player.id,
      from: player.position,
      to: finalDest,
      delta,
      special,
      vote,
      won: finalDest >= 100,
    };
  });

  // Apply movements
  room.players = players.map(p => {
    const m = movements.find(mv => mv.playerId === p.id);
    return { ...p, position: m.to };
  });

  room.currentVotes = filledVotes;
  room.lastMovements = movements;
  room.round += 1;
  room.roundHistory.push({
    round: room.round,
    themeId: activeTheme.id,
    dilemmaId: room.activeDilemma.id,
    isTie,
    yesCount: yesIds.length,
    noCount: noIds.length,
  });

  const winnerMov = movements.find(m => m.won);
  if (winnerMov) {
    room.winner = room.players.find(p => p.id === winnerMov.playerId);
    room.phase = "GAME_OVER";
  } else {
    room.phase = "RESULTS";
  }
}

function drawNextRound(room) {
  // Cycle theme
  const theme = room.themeDeck.shift();
  room.themeDeck.push(theme);
  room.activeTheme = theme;

  // Cycle dilemma
  const dilemma = room.dilemmaPool.shift();
  room.dilemmaPool.push(dilemma);
  room.activeDilemma = dilemma;

  room.currentVotes = {};
  room.lastMovements = [];
}

// ─── Timer ───────────────────────────────────────────────────────────

function startVoteTimer(room, code) {
  clearVoteTimer(room);
  room.timerStartedAt = Date.now();
  room.voteTimer = setTimeout(() => {
    if (rooms.has(code) && rooms.get(code).phase === "VOTING") {
      const r = rooms.get(code);
      resolveVotes(r);
      io.to(code).emit("game:state", safeRoom(r));
    }
  }, VOTE_TIMER * 1000);
}

function clearVoteTimer(room) {
  if (room.voteTimer) {
    clearTimeout(room.voteTimer);
    room.voteTimer = null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// SOCKET EVENTS
// ═══════════════════════════════════════════════════════════════════

io.on("connection", (socket) => {
  console.log(`[+] Socket connected: ${socket.id}`);

  // ── Host creates a room ────────────────────────────────────────────
  socket.on("room:create", ({ hostName }, callback) => {
    const room = createRoom(socket.id, hostName);
    socket.join(room.code);
    console.log(`[room] Created ${room.code} by ${hostName}`);
    callback({ success: true, room: safeRoom(room) });
  });

  // ── Player joins a room ────────────────────────────────────────────
  socket.on("room:join", ({ code, playerName }, callback) => {
    const room = rooms.get(code.toUpperCase());

    if (!room) return callback({ success: false, error: "Room not found. Check your code." });
    if (room.phase !== "LOBBY") return callback({ success: false, error: "Game already in progress." });
    if (room.players.length >= 8) return callback({ success: false, error: "Room is full (max 8 players)." });

    const colorIndex = room.players.length % PLAYER_COLORS.length;
    const player = {
      id: socket.id,
      name: playerName || `Player ${room.players.length + 1}`,
      position: 0,
      color: PLAYER_COLORS[colorIndex],
      emoji: PLAYER_EMOJIS[colorIndex],
      isHost: false,
    };

    room.players.push(player);
    socket.join(code.toUpperCase());
    console.log(`[room] ${playerName} joined ${code}`);

    // Notify everyone in the room
    io.to(code.toUpperCase()).emit("game:state", safeRoom(room));
    callback({ success: true, player, room: safeRoom(room) });
  });

  // ── Host starts the game ───────────────────────────────────────────
  socket.on("game:start", ({ code }, callback) => {
    const room = rooms.get(code);
    if (!room) return callback?.({ success: false, error: "Room not found" });
    if (room.hostSocketId !== socket.id) return callback?.({ success: false, error: "Only the host can start." });
    if (room.players.length < 2) return callback?.({ success: false, error: "Need at least 2 players." });

    drawNextRound(room);
    room.phase = "THEME_REVEAL";

    io.to(code).emit("game:state", safeRoom(room));
    callback?.({ success: true });
  });

  // ── Host advances from theme reveal to voting ──────────────────────
  socket.on("game:startVoting", ({ code }) => {
    const room = rooms.get(code);
    if (!room || room.hostSocketId !== socket.id) return;

    room.phase = "VOTING";
    io.to(code).emit("game:state", safeRoom(room));
    startVoteTimer(room, code);
  });

  // ── Player casts a vote ────────────────────────────────────────────
  socket.on("game:vote", ({ code, vote }) => {
    const room = rooms.get(code);
    if (!room || room.phase !== "VOTING") return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    room.currentVotes[socket.id] = vote; // "yes" | "no"

    // Broadcast updated vote count (but NOT who voted what yet)
    io.to(code).emit("game:voteUpdate", {
      votedCount: Object.keys(room.currentVotes).length,
      totalPlayers: room.players.length,
    });

    // Auto-resolve if everyone voted
    const allVoted = room.players.every(p => room.currentVotes[p.id] !== undefined);
    if (allVoted) {
      clearVoteTimer(room);
      resolveVotes(room);
      io.to(code).emit("game:state", safeRoom(room));
    }
  });

  // ── Host advances from results to next round ───────────────────────
  socket.on("game:nextRound", ({ code }) => {
    const room = rooms.get(code);
    if (!room || room.hostSocketId !== socket.id) return;

    drawNextRound(room);
    room.phase = "THEME_REVEAL";

    io.to(code).emit("game:state", safeRoom(room));
  });

  // ── Host resets the game ───────────────────────────────────────────
  socket.on("game:reset", ({ code }) => {
    const room = rooms.get(code);
    if (!room || room.hostSocketId !== socket.id) return;

    clearVoteTimer(room);
    room.phase = "LOBBY";
    room.players = room.players.map((p, i) => ({ ...p, position: 0 }));
    room.themeDeck = shuffle([...THEME_CARDS]);
    room.dilemmaPool = shuffle([...DILEMMA_CARDS]);
    room.activeTheme = null;
    room.activeDilemma = null;
    room.currentVotes = {};
    room.lastMovements = [];
    room.roundHistory = [];
    room.round = 0;
    room.winner = null;

    io.to(code).emit("game:state", safeRoom(room));
  });

  // ── Disconnect handling ────────────────────────────────────────────
  socket.on("disconnect", () => {
    console.log(`[-] Socket disconnected: ${socket.id}`);

    // Find any room this socket was in
    for (const [code, room] of rooms.entries()) {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex === -1) continue;

      if (room.hostSocketId === socket.id) {
        // Host left — notify players, clean up room
        clearVoteTimer(room);
        io.to(code).emit("room:hostLeft", { message: "The host disconnected. Game ended." });
        rooms.delete(code);
        console.log(`[room] Deleted ${code} — host left`);
      } else {
        // Player left — remove and notify
        room.players.splice(playerIndex, 1);
        io.to(code).emit("game:state", safeRoom(room));
        io.to(code).emit("room:playerLeft", { name: room.players[playerIndex]?.name });
        console.log(`[room] Player left ${code}`);
      }
      break;
    }
  });
});

// ─── Start Server ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ Moral Descent server running on port ${PORT}`);
});

// Clean up old empty rooms every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (room.players.length === 0) {
      rooms.delete(code);
      console.log(`[cleanup] Removed empty room ${code}`);
    }
  }
}, 30 * 60 * 1000);
