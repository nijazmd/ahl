const scriptURL = "https://script.google.com/macros/s/AKfycbyZ7XbB0T5xsrPKYJ_3vV5u3-k1hw9j_AK2Tp2cHXqBplsnbEtBMETGx8Vsft-_cfRU/exec";

async function init() {
  try {
    const [teamTotals, games] = await Promise.all([
      fetch(scriptURL + "?action=loadTeamTotals").then(r=>r.json()),
      fetch(scriptURL + "?action=loadGames").then(r=>r.json())
    ]);
    renderStandingsFromTotals(teamTotals);
    renderLast5Games(games);
  } catch (err) {
    console.error("Init failed:", err);
  }
}

function renderStandingsFromTotals(rows) {
  // Normalize & compute Pts Avg
  const teams = rows.map(r => {
    const G = Number(r.Games||0);
    const Pts = Number(r.Points||0);
    const GF = Number(r.GoalsFor||0);
    const GA = Number(r.GoalsAgainst||0);
    const GD = GF - GA;
    const HG = Number(r.HomeGames||0);
    const ptsAvg = G > 0 ? Pts / G : 0;
    return {
      team: r.Team,
      games: G,
      pts: Pts,
      ptsAvg,
      gd: GD,
      gf: GF,
      ga: GA,
      hg: HG
    };
  });

  // Sort by Pts Avg (desc), then Points, then GD
  teams.sort((a,b)=>{
    if (b.ptsAvg !== a.ptsAvg) return b.ptsAvg - a.ptsAvg;
    if (b.pts !== a.pts) return b.pts - a.pts;
    return b.gd - a.gd;
  });

  const tbody = document.querySelector("#standingsTable tbody");
  tbody.innerHTML = "";
  teams.forEach((t, i) => {
    const row = `<tr>
      <td>${i + 1}</td>
      <td><a href="team.html?teamName=${encodeURIComponent(t.team)}" class="team-link">${t.team}</a></td>
      <td>${t.games}</td>
      <td>${t.ptsAvg.toFixed(2)}</td>
      <td>${t.pts}</td>
      <td>${t.gd}</td>
      <td>${t.gf}</td>
      <td>${t.ga}</td>
      <td>${t.hg}</td>
    </tr>`;
    tbody.insertAdjacentHTML("beforeend", row);
  });
}

function fmtYYMMDD(dateStr) {
  // Keep only date part; format YY/MM/DD
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) {
    // if Date contains time already as string, take first 10 chars
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
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${yy}/${mm}/${dd}`;
}

function renderLast5Games(games) {
  const container = document.getElementById("last5GamesContainer");
  container.innerHTML = "";

  const sortedGames = [...games].sort((a, b) => new Date(b.Date) - new Date(a.Date));
  sortedGames.slice(0, 5).forEach(game => {
    const teamName = game.Team;
    const opponentName = game.OpponentTeamName;
    const teamGoals = Number(game.TeamGoals || 0);
    const goalsConceded = Number(game.GoalsConceded || 0);
    const gameType = game.GameType;

    let result = "L";
    if (teamGoals > goalsConceded) {
      result = (gameType === "Shootout" || gameType === "ExtraTime") ? "WE" : "W";
    }
    const resultClass = result === "W" ? "win" : result === "WE" ? "we" : "loss";
    const resultText = result === "WE" ? `W<span class="extra-time">(e)</span>` : result;

    const card = document.createElement("div");
    card.className = "recent-game-card";
    card.innerHTML = `
      <div class="game-info">
        <div class="game-line">🏟️ ${teamName} vs ${opponentName}</div>
        <div class="result-tag ${resultClass}">${resultText}</div>
        <div class="game-line">📅 ${fmtYYMMDD(game.Date)}</div>
        <div class="game-line">🏒 ${teamGoals} - ${goalsConceded}</div>
        <div class="game-link"><a href="game.html?id=${game.GameID}">🔍 View</a></div>
      </div>`;
    container.appendChild(card);
  });
}

init();
