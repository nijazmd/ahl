const scriptURL = "https://script.google.com/macros/s/AKfycbyZ7XbB0T5xsrPKYJ_3vV5u3-k1hw9j_AK2Tp2cHXqBplsnbEtBMETGx8Vsft-_cfRU/exec";

let allGames = [];
let allPlayers = [];
let teamTotals = [];
let playerTotals = [];
let playerStatsData = []; // still used for shootout opponent stats

document.addEventListener("DOMContentLoaded", init);

async function init() {
  const urlParams = new URLSearchParams(window.location.search);
  const selectedTeamFromURL = urlParams.get("teamName");

  // Load everything we need
  const [teamsRes, gamesRes, teamTotalsRes, playerTotalsRes, playerStatsRes] = await Promise.all([
    fetch(scriptURL + "?action=loadTeamsAndPlayers").then(r=>r.json()),
    fetch(scriptURL + "?action=loadGames").then(r=>r.json()),
    fetch(scriptURL + "?action=loadTeamTotals").then(r=>r.json()),
    fetch(scriptURL + "?action=loadPlayerTotals").then(r=>r.json()),
    fetch(scriptURL + "?action=loadPlayerStats").then(r=>r.json()),
  ]);

  allPlayers   = teamsRes.players;
  allGames     = gamesRes;
  teamTotals   = teamTotalsRes;
  playerTotals = playerTotalsRes;
  playerStatsData = playerStatsRes;

  // Build team radios
  const teamRadioContainer = document.getElementById("teamRadioContainer");
  teamRadioContainer.innerHTML = "";
  teamsRes.teams.forEach(team => {
    const id = `team_${team}`;
    const label = document.createElement("label");
    label.innerHTML = `
      <input type="radio" name="teamRadio" id="${id}" value="${team}" ${selectedTeamFromURL === team ? "checked" : ""}>
      <span>${team}</span>
    `;
    teamRadioContainer.appendChild(label);
  });

  teamRadioContainer.addEventListener("change", loadTeamData);

  // If nothing checked, select first
  if (!document.querySelector('input[name="teamRadio"]:checked')) {
    const first = teamRadioContainer.querySelector('input[name="teamRadio"]');
    if (first) first.checked = true;
  }

  loadTeamData();
}

function fmtYYMMDD(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (!isNaN(d)) {
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth()+1).padStart(2,"0");
    const dd = String(d.getDate()).padStart(2,"0");
    return `${yy}/${mm}/${dd}`;
  }
  // Fallback for non-ISO strings
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

function loadTeamData() {
  const team = document.querySelector('input[name="teamRadio"]:checked')?.value;
  if (!team) return;

  // ---- Pull core tallies from TeamTotals ----
  const tRow = teamTotals.find(r => r.Team === team) || {};
  const G  = Number(tRow.Games || 0);
  const GF = Number(tRow.GoalsFor || 0);
  const GA = Number(tRow.GoalsAgainst || 0);
  const GD = GF - GA;
  const Pts = Number(tRow.Points || 0);

  const RegW = Number(tRow.RegWins || 0);
  const RegL = Number(tRow.RegLosses || 0);
  const ETW  = Number(tRow.ETWins || 0);
  const ETL  = Number(tRow.ETLosses || 0);
  const SOW  = Number(tRow.SOWins || 0);
  const SOL  = Number(tRow.SOLosses || 0);

  const HG = Number(tRow.HomeGames || 0);
  const AWG = Number(tRow.AwayGames || 0);
  const HW = Number(tRow.HomeWins || 0);
  const AW = Number(tRow.AwayWins || 0);

  const wins   = RegW + ETW + SOW;
  const losses = RegL + ETL + SOL;

  const avgGoals     = G ? (GF / G).toFixed(2) : "0.00";
  const avgConceded  = G ? (GA / G).toFixed(2) : "0.00";
  const winPct       = G ? ((wins / G) * 100).toFixed(1) : "0.0";
  const regWinPct    = G ? ((RegW / G) * 100).toFixed(1) : "0.0";
  const soWinPct     = G ? ((SOW / G) * 100).toFixed(1) : "0.0";
  const etWinPct     = G ? ((ETW / G) * 100).toFixed(1) : "0.0";
  const etLoseInclSO = G ? (((ETL + SOL) / G) * 100).toFixed(1) : "0.0";

  const homeWinPct = HG ? ((HW / HG) * 100).toFixed(1) : "0.0";
  const awayWinPct = AWG ? ((AW / AWG) * 100).toFixed(1) : "0.0";

  // ---- Clean sheets & no-goals from Games (same approach as before) ----
  let cleanSheets = 0, noGoals = 0;
  const recentGames = [];
  allGames.forEach(game => {
    const isTeamHome = game.Team === team;
    const isTrackedOpp = game.OpponentType === "Tracked";
    const isOppAsTeam = isTrackedOpp && game.OpponentTeamName === team;

    if (isTeamHome || isOppAsTeam) {
      const teamGoals = Number(isTeamHome ? game.TeamGoals : game.GoalsConceded);
      const conceded  = Number(isTeamHome ? game.GoalsConceded : game.TeamGoals);

      if (conceded === 0) cleanSheets++;
      if (teamGoals === 0) noGoals++;

      // Result tag
      let result = "L";
      if (teamGoals > conceded) {
        result = (game.GameType === "Shootout" || game.GameType === "ExtraTime") ? "WE" : "W";
      }

      recentGames.push({
        GameID: game.GameID,
        date: game.Date,
        opponent: isTeamHome ? game.OpponentTeamName : game.Team,
        result,
        teamGoals,
        goalsConceded: conceded
      });
    }
  });

  // ---- Render Overview / Scores / Averages / Wins ----
  const container = document.getElementById("teamStatsContainer");
  container.innerHTML = `
    <div class="stat-section">
      <h3 class="stat-heading">Overview</h3>
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-label">Games Played</div><div class="stat-value">${G}</div></div>
        <div class="stat-card"><div class="stat-label">Wins</div><div class="stat-value">${wins}</div></div>
        <div class="stat-card"><div class="stat-label">Losses</div><div class="stat-value">${losses}</div></div>
        <div class="stat-card"><div class="stat-label">Points</div><div class="stat-value">${Pts}</div></div>
        <div class="stat-card"><div class="stat-label">Pts Avg</div><div class="stat-value">${G ? (Pts/G).toFixed(2) : "0.00"}</div></div>
      </div>
    </div>

    <div class="stat-section">
      <h3 class="stat-heading">Scores</h3>
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-label">Goals For</div><div class="stat-value">${GF}</div></div>
        <div class="stat-card"><div class="stat-label">Goals Against</div><div class="stat-value">${GA}</div></div>
        <div class="stat-card"><div class="stat-label">Goal Difference</div><div class="stat-value">${GD}</div></div>
        <div class="stat-card"><div class="stat-label">Avg GF/Game</div><div class="stat-value">${avgGoals}</div></div>
        <div class="stat-card"><div class="stat-label">Avg GA/Game</div><div class="stat-value">${avgConceded}</div></div>
      </div>
    </div>

    <div class="stat-section">
      <h3 class="stat-heading">Averages</h3>
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-label">Win %</div><div class="stat-value">${winPct}%</div></div>
        <div class="stat-card"><div class="stat-label">Reg Time Win %</div><div class="stat-value">${regWinPct}%</div></div>
        <div class="stat-card"><div class="stat-label">Extra Time Win %</div><div class="stat-value">${etWinPct}%</div></div>
        <div class="stat-card"><div class="stat-label">ET Lose % (incl. SO)</div><div class="stat-value">${etLoseInclSO}%</div></div>
        <div class="stat-card"><div class="stat-label">Shootout Win %</div><div class="stat-value">${soWinPct}%</div></div>
      </div>
    </div>

    <div class="stat-section">
      <h3 class="stat-heading">Wins</h3>
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-label">Regulation Wins</div><div class="stat-value">${RegW}</div></div>
        <div class="stat-card"><div class="stat-label">Extra Time Wins</div><div class="stat-value">${ETW}</div></div>
        <div class="stat-card"><div class="stat-label">Shootout Wins</div><div class="stat-value">${SOW}</div></div>
      </div>
    </div>
  `;

  // ---- Home / Away section (with win %) ----
  const homeAwayHTML = `
    <div class="split-columns">
      <div class="home-away-box">
        <h3>Home Performance</h3>
        <div class="split-stats">
          <div><strong>Games:</strong> ${HG}</div>
          <div><strong>Wins:</strong> ${HW}</div>
          <div><strong>Win %:</strong> ${homeWinPct}%</div>
        </div>
      </div>

      <div class="home-away-box">
        <h3>Away Performance</h3>
        <div class="split-stats">
          <div><strong>Games:</strong> ${AWG}</div>
          <div><strong>Wins:</strong> ${AW}</div>
          <div><strong>Win %:</strong> ${awayWinPct}%</div>
        </div>
      </div>
    </div>
  `;
  document.getElementById("homeAwayStatsContainer").innerHTML = homeAwayHTML;

  // ---- Shootout block (from PlayerStats; fixed OpponentTeam field) ----
  let shootoutAttempts = 0, shootoutGoals = 0;
  let oppShootoutAttempts = 0, oppShootoutGoals = 0;

  playerStatsData.forEach(stat => {
    if (stat.Team === team) {
      shootoutAttempts += Number(stat.ShootoutAttempts || 0);
      shootoutGoals    += Number(stat.ShootoutGoals || 0);
    }
    if (stat.OpponentTeam === team) { // FIXED: column name is OpponentTeam
      oppShootoutAttempts += Number(stat.ShootoutAttempts || 0);
      oppShootoutGoals    += Number(stat.ShootoutGoals || 0);
    }
  });

  const shootoutGoalPct = shootoutAttempts ? ((shootoutGoals / shootoutAttempts) * 100).toFixed(1) : "0.0";
  const denialPct = oppShootoutAttempts ? (((oppShootoutAttempts - oppShootoutGoals) / oppShootoutAttempts) * 100).toFixed(1) : "0.0";

  const advancedStatsContainer = document.getElementById("teamAdvancedStats");
  advancedStatsContainer.innerHTML = `
    <div class="stat-card"><div class="stat-label">Clean Sheets</div><div class="stat-value">${cleanSheets}</div></div>
    <div class="stat-card"><div class="stat-label">No Goals</div><div class="stat-value">${noGoals}</div></div>
    <div class="stat-card"><div class="stat-label">Shootout Attempts</div><div class="stat-value">${shootoutAttempts}</div></div>
    <div class="stat-card"><div class="stat-label">Shootout Goals</div><div class="stat-value">${shootoutGoals}</div></div>
    <div class="stat-card"><div class="stat-label">Opponent Attempts</div><div class="stat-value">${oppShootoutAttempts}</div></div>
    <div class="stat-card"><div class="stat-label">Opponent Goals</div><div class="stat-value">${oppShootoutGoals}</div></div>
    <div class="stat-card"><div class="stat-label">Goal %</div><div class="stat-value">${shootoutGoalPct}%</div></div>
    <div class="stat-card"><div class="stat-label">Denial %</div><div class="stat-value">${denialPct}%</div></div>
  `;

  // ---- Player table from PlayerTotals (fast) ----
  const tableBody = document.getElementById("playerStatsTable");
  tableBody.innerHTML = "";

  const totalsByTeam = playerTotals.filter(r => r.Team === team);
  const playersById = Object.fromEntries(allPlayers.map(p => [String(p.PlayerID), p]));

  const rows = totalsByTeam.map(t => {
    const p = playersById[String(t.PlayerID)] || {};
    const goals = Number(t.Goals || 0);
    const assists = Number(t.Assists || 0);
    const points = goals + assists;
    return {
      id: t.PlayerID,
      name: p.PlayerName || t.PlayerName || "(unknown)",
      position: p.PositionMain || t.PositionMain || "-",
      games: Number(t.Games || 0),
      goals,
      assists,
      points
    };
  });

  rows.sort((a,b)=> b.points - a.points || b.goals - a.goals);

  rows.forEach(r => {
    tableBody.insertAdjacentHTML("beforeend", `
      <tr>
        <td><a href="player-single.html?playerId=${encodeURIComponent(r.id)}">${r.name}</a></td>
        <td>${r.position}</td>
        <td>${r.games}</td>
        <td>${r.goals}</td>
        <td>${r.assists}</td>
        <td>${r.points}</td>
      </tr>
    `);
  });

  // ---- Recent Games (YY/MM/DD) ----
  const recentGamesContainer = document.getElementById("recentGamesContainer");
  recentGames.sort((a, b) => new Date(b.date) - new Date(a.date));
  recentGamesContainer.innerHTML = "";

  recentGames.slice(0, 5).forEach(game => {
    const resultClass = game.result === "W" ? "win" : game.result === "WE" ? "we" : "loss";
    const resultText = game.result === "WE" ? `W<span class="extra-time">(e)</span>` : game.result;
    const dateStr = fmtYYMMDD(game.date);

    const gameDiv = document.createElement("div");
    gameDiv.className = "recent-game-card";
    gameDiv.innerHTML = `
      <div class="result-tag ${resultClass}">${resultText}</div>
      <div class="game-info">
        <div class="game-line">📅 ${dateStr}</div>
        <div class="game-line">🆚 ${game.opponent}</div>
        <div class="game-line">🏒 ${game.teamGoals} - ${game.goalsConceded}</div>
        <div class="game-link"><a href="game.html?id=${game.GameID}">🔍 View</a></div>
      </div>
    `;
    recentGamesContainer.appendChild(gameDiv);
  });

  // ---- Last 5 game summary tags ----
  const summaryContainer = document.getElementById("gameSummaryContainer");
  summaryContainer.innerHTML = "";
  recentGames.slice(0, 5).forEach(game => {
    const tag = document.createElement("div");
    tag.className = `game-tag ${game.result}`;
    tag.innerHTML = game.result === "WE" ? `W<span class="extra-time">(e)</span>` : game.result;
    summaryContainer.appendChild(tag);
  });

  // --- RIVALRIES LIST ---
  const rivals = computeRivals(team, allGames);
  const rivWrap = document.getElementById("rivalriesContainer");
  rivWrap.innerHTML = `
  <table>
    <thead>
      <tr>
        <th>Rival</th>
        <th>GP</th>
        <th>W</th>
        <th>L</th>
        <th>Win Diff</th>
        <th>GD</th>
        <th>Avg GF/G</th>
        <th>Avg GA/G</th>
      </tr>
    </thead>
    <tbody>
      ${rivals.map(r => `
        <tr>
          <td>
            <a class="team-link" href="rivalry.html?team=${encodeURIComponent(team)}&with=${encodeURIComponent(r.name)}">
              ${r.name}
            </a>
          </td>
          <td>${r.gp}</td>
          <td>${r.w}</td>
          <td>${r.l}</td>
          <td>${r.w - r.l}</td>
          <td>${r.gd}</td>
          <td>${r.gp ? (r.gf / r.gp).toFixed(2) : "0.00"}</td>
          <td>${r.gp ? (r.ga / r.gp).toFixed(2) : "0.00"}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>
`;

  
}
function computeRivals(team, games){
  const map = new Map();
  games.forEach(g => {
    let opp = null, gf = 0, ga = 0;

    if (g.Team === team) {
      opp = g.OpponentTeamName;
      gf = Number(g.TeamGoals || 0);
      ga = Number(g.GoalsConceded || 0);
    } else if (g.OpponentType === "Tracked" && g.OpponentTeamName === team) {
      opp = g.Team;
      gf = Number(g.GoalsConceded || 0);
      ga = Number(g.TeamGoals || 0);
    }

    if (!opp) return;
    if (!map.has(opp)) map.set(opp, { name: opp, gp:0, w:0, l:0, gf:0, ga:0, gd:0 });

    const r = map.get(opp);
    r.gp++;
    r.gf += gf;
    r.ga += ga;
    r.gd = r.gf - r.ga;
    if (gf > ga) r.w++;
    else if (gf < ga) r.l++;
  });

  // Sort by Win Diff desc, then GP desc, then name
  return Array.from(map.values()).sort((a,b) =>
    (b.w - b.l) - (a.w - a.l) || b.gp - a.gp || a.name.localeCompare(b.name)
  );
}


function renderRivalries(team, games){
  const rivals = computeRivals(team, games);
  const rowsHtml = rivals.map(r => `
    <tr>
      <td>
        <a class="team-link" href="rivalry.html?teamA=${encodeURIComponent(team)}&teamB=${encodeURIComponent(r.name)}">
          ${r.name}
        </a>
      </td>
      <td>${r.gp}</td>
      <td>${r.w}</td>
      <td>${r.l}</td>
      <td>${r.w - r.l}</td>
      <td>${r.gd}</td>
      <td>${r.gp ? (r.gf / r.gp).toFixed(2) : "0.00"}</td>
      <td>${r.gp ? (r.ga / r.gp).toFixed(2) : "0.00"}</td>
    </tr>
  `).join("");

  document.getElementById("rivalriesContainer").innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Rival</th>
          <th>GP</th>
          <th>W</th>
          <th>L</th>
          <th>Win Diff</th>
          <th>GD</th>
          <th>Avg GF/G</th>
          <th>Avg GA/G</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;
}
