const scriptURL = "https://script.google.com/macros/s/AKfycbyZ7XbB0T5xsrPKYJ_3vV5u3-k1hw9j_AK2Tp2cHXqBplsnbEtBMETGx8Vsft-_cfRU/exec";

document.addEventListener("DOMContentLoaded", init);

async function init() {
  const urlParams = new URLSearchParams(window.location.search);
  const playerId = urlParams.get("playerId");

  if (!playerId) {
    document.getElementById("playerName").innerText = "Player not found";
    return;
  }

  const [playersRes, playerTotalsRes, playerStatsRes, gamesRes] = await Promise.all([
    fetch(scriptURL + "?action=loadTeamsAndPlayers").then(r=>r.json()),
    fetch(scriptURL + "?action=loadPlayerTotals").then(r=>r.json()),
    fetch(scriptURL + "?action=loadPlayerStats").then(r=>r.json()),
    fetch(scriptURL + "?action=loadGames").then(r=>r.json())
  ]);

  const players = playersRes.players || [];
  const totals = playerTotalsRes || [];
  const playerStats = playerStatsRes || [];
  const games = gamesRes || [];

  const player = players.find(p => String(p.PlayerID) === String(playerId));
  if (!player) {
    document.getElementById("playerName").innerText = "Player not found";
    return;
  }

  // Meta from Players sheet
  const name = player.PlayerName || "";
  const team = player.Team || "";
  const pos  = player.PositionMain || "-";
  const homeClub = player.HomeClub || "";
  const line = player.Line ?? "";
  const skill = player.Skill ?? "";
  const jersey = player.Jersey ?? player["J#"] ?? "";
  const posSub = player.PositionSub || "";

  // Totals from PlayerTotals (may be empty for new players)
  const tRow = totals.find(t => String(t.PlayerID) === String(playerId)) || {};
  const G   = toNum(tRow.Games);
  const Gls = toNum(tRow.Goals);
  const Ast = toNum(tRow.Assists);
  const Pts = Gls + Ast;
  const CS  = toNum(tRow.CleanSheet);
  const NG  = toNum(tRow.NoGoal);
  const SOA = toNum(tRow.ShootoutAttempts);
  const SOG = toNum(tRow.ShootoutGoals);
  const SOpct = SOA ? ((SOG / SOA) * 100).toFixed(1) : "0.0";

  // Header + meta
  el("playerName").innerHTML = name;
  el("teamName").innerHTML = team;
  el("playerPosition").innerHTML = pos;
  el("playerMeta").innerHTML = [
    metaCard("AHL Club", team),
    metaCard("Home Club", homeClub || "-"),
    metaCard("Line", line !== "" ? line : "-"),
    metaCard("Skill", skill !== "" ? skill : "-"),
    metaCard("Position (Main)", pos || "-"),
    metaCard("Jersey #", jersey || "-"),
    metaCard("Position (Sub)", posSub || "-")
  ].join("");

  // Prepare per-game view for this player
  const statsByGame = playerStats.filter(s => String(s.PlayerID) === String(playerId));
  const gameById = Object.fromEntries(games.map(g => [g.GameID, g]));

  // Common accumulators
  let totalGamesPlayed = 0;
  let totalConceded = 0;
  let wins = 0;
  let cleanSheetsCount = 0;
  let shootoutsPlayed = 0;
  let shootoutsFaced = 0;
  let shootoutGoalsAllowed = 0;
  let shootoutWins = 0;

  // Home/Away accumulators for GK view
  const side = {
    home: { games:0, conceded:0, wins:0, cleanSheets:0 },
    away: { games:0, conceded:0, wins:0, cleanSheets:0 }
  };

  const recent = [];

  statsByGame.forEach(s => {
    const g = gameById[s.GameID];
    if (!g) return;

    totalGamesPlayed++;

    const isHome = g.Team === team;
    const teamGoals   = isHome ? toNum(g.TeamGoals) : toNum(g.GoalsConceded);
    const conceded    = isHome ? toNum(g.GoalsConceded) : toNum(g.TeamGoals);
    const gameType    = String(g.GameType || "");

    // result (consider shootout separately)
    let won = false;
    if (gameType === "Shootout") {
      const ourSOG = isHome ? toNum(get(g, ["teamSOGoals","TeamSOGoals","Team SO Goals"])) 
                            : toNum(get(g, ["oppSOGoals","OppSOGoals","Opp SO Goals"]));
      const oppSOG = isHome ? toNum(get(g, ["oppSOGoals","OppSOGoals","Opp SO Goals"])) 
                            : toNum(get(g, ["teamSOGoals","TeamSOGoals","Team SO Goals"]));
      won = ourSOG > oppSOG;

      // shootout faced/allowed from opponent perspective
      const faced = isHome ? toNum(get(g, ["oppShootOutAttempts","OppShootOutAttempts","Opp SO Attempts"]))
                           : toNum(get(g, ["teamShootOutAttempts","TeamShootOutAttempts","Team SO Attempts"]));
      const allowed = isHome ? toNum(get(g, ["oppSOGoals","OppSOGoals","Opp SO Goals"]))
                             : toNum(get(g, ["teamSOGoals","TeamSOGoals","Team SO Goals"]));
      shootoutsPlayed++;
      shootoutsFaced += faced;
      shootoutGoalsAllowed += allowed;
      if (won) shootoutWins++;

    } else {
      won = teamGoals > conceded;
    }

    if (won) wins++;

    totalConceded += conceded;
    if (conceded === 0) cleanSheetsCount++;

    const bucket = isHome ? side.home : side.away;
    bucket.games++;
    bucket.conceded += conceded;
    if (won) bucket.wins++;
    if (conceded === 0) bucket.cleanSheets++;

    // recent card
    const opp = isHome ? g.OpponentTeamName : g.Team;
    const result = won ? ((gameType === "Shootout" || gameType === "ExtraTime") ? "WE" : "W") : "L";
    recent.push({
      GameID: g.GameID,
      date: g.Date,
      opponent: opp,
      result,
      teamGoals,
      conceded
    });
  });

  // ---- RENDER: GK vs Skater ----
  const isGK = (pos || "").toUpperCase() === "G";

  if (isGK) {
    // GK totals block
    const games = totalGamesPlayed; // authoritative for GK section
    const csPct = games ? ((cleanSheetsCount / games) * 100).toFixed(1) : "0.0";
    const gcAvg = games ? (totalConceded / games).toFixed(2) : "0.00";
    const soDenials = Math.max(0, shootoutsFaced - shootoutGoalsAllowed);
    const soWinRate = shootoutsPlayed ? ((shootoutWins / shootoutsPlayed) * 100).toFixed(1) : "0.0";
    const winPct = games ? ((wins / games) * 100).toFixed(1) : "0.0";

    el("totalStats").innerHTML = [
      card("Total Games", games),
      card("Clean Sheets", cleanSheetsCount),
      card("Total Goals Conceded", totalConceded),
      card("Goals Conceded Avg.", gcAvg),
      card("Shootouts Faced", shootoutsFaced),
      card("Shootout Denials", soDenials),
      card("Shootout Win Rate", `${soWinRate}%`),
      card("Clean Sheet %", `${csPct}%`),
      card("Win %", `${winPct}%`)
    ].join("");

    // GK Home/Away simplified
    const homeWinPct = side.home.games ? ((side.home.wins / side.home.games) * 100).toFixed(1) : "0.0";
    const homeCSPct  = side.home.games ? ((side.home.cleanSheets / side.home.games) * 100).toFixed(1) : "0.0";
    const homeGcAvg  = side.home.games ? (side.home.conceded / side.home.games).toFixed(2) : "0.00";

    const awayWinPct = side.away.games ? ((side.away.wins / side.away.games) * 100).toFixed(1) : "0.0";
    const awayCSPct  = side.away.games ? ((side.away.cleanSheets / side.away.games) * 100).toFixed(1) : "0.0";
    const awayGcAvg  = side.away.games ? (side.away.conceded / side.away.games).toFixed(2) : "0.00";

    el("homeStats").innerHTML = `
      <div><strong>Games:</strong> ${side.home.games}</div>
      <div><strong>Win %:</strong> ${homeWinPct}%</div>
      <div><strong>Clean Sheet %:</strong> ${homeCSPct}%</div>
      <div><strong>Avg. Goal Conceded:</strong> ${homeGcAvg}</div>
    `;
    el("awayStats").innerHTML = `
      <div><strong>Games:</strong> ${side.away.games}</div>
      <div><strong>Win %:</strong> ${awayWinPct}%</div>
      <div><strong>Clean Sheet %:</strong> ${awayCSPct}%</div>
      <div><strong>Avg. Goal Conceded:</strong> ${awayGcAvg}</div>
    `;

    // Hide GK extras section header we previously used; we already show GK metrics in totals area.
    hide("gkStatsSection");
  } else {
    // Skater totals (existing behavior)
    el("totalStats").innerHTML = [
      card("Games", G),
      card("Goals", Gls),
      card("Assists", Ast),
      card("Points", Pts),
      card("Points/Game", G ? (Pts / G).toFixed(2) : "0.00"),
      card("Clean Sheets (team)", CS),
      card("No Goals (team)", NG),
      card("SO Attempts", SOA),
      card("SO Goals", SOG),
      card("SO Goal %", `${SOpct}%`)
    ].join("");

    // Keep the previous home/away blocks for skaters (goals/assists/points)
    // We already accumulated conceded for GK; for skaters we can reuse team-based conceded averages if you want—left as-is from earlier implementation.
  }

  // Recent games (last 5) — shared
  recent.sort((a,b)=> new Date(b.date) - new Date(a.date));
  const recentWrap = el("recentGames");
  recentWrap.innerHTML = "";
  recent.slice(0,5).forEach(g => {
    const resultClass = g.result === "W" ? "win" : g.result === "WE" ? "we" : "loss";
    const resultText = g.result === "WE" ? `W<span class="extra-time">(e)</span>` : g.result;
    const dateStr = fmtYYMMDD(g.date);

    const cardDiv = document.createElement("div");
    cardDiv.className = "recent-game-card";
    cardDiv.innerHTML = `
      <div class="result-tag ${resultClass}">${resultText}</div>
      <div class="game-info">
        <div class="game-line">📅 ${dateStr}</div>
        <div class="game-line">🆚 ${g.opponent}</div>
        <div class="game-line">🏒 ${g.teamGoals} - ${g.conceded}</div>
        <div class="game-link"><a href="game.html?id=${g.GameID}">🔍 View</a></div>
      </div>
    `;
    recentWrap.appendChild(cardDiv);
  });
}

/* ---------- helpers ---------- */
function el(id){ return document.getElementById(id); }
function hide(id){ el(id).style.display = "none"; }
function toNum(v){ const n = Number(v||0); return isNaN(n) ? 0 : n; }
function get(obj, keys){
  for (const k of keys) if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== "") return obj[k];
  return 0;
}
function metaCard(label, value){
  return `<div class="stat-card"><div class="stat-label">${label}</div><div class="stat-value">${escapeHtml(String(value))}</div></div>`;
}
function card(label, value){
  return `<div class="stat-card"><div class="stat-label">${label}</div><div class="stat-value">${value}</div></div>`;
}
function fmtYYMMDD(dateStr){
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (!isNaN(d)) {
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth()+1).padStart(2,"0");
    const dd = String(d.getDate()).padStart(2,"0");
    return `${yy}/${mm}/${dd}`;
  }
  const raw = String(dateStr).slice(0,10);
  const p = raw.split(/[-/]/);
  if (p.length >= 3) {
    const yy = String(p[0]).length === 4 ? p[0].slice(2) : p[2].slice(2);
    const mm = p[1].padStart(2,"0");
    const dd = (String(p[0]).length === 4 ? p[2] : p[0]).padStart(2,"0");
    return `${yy}/${mm}/${dd}`;
  }
  return dateStr;
}
function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}
