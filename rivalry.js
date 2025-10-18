const scriptURL = "https://script.google.com/macros/s/AKfycbyZ7XbB0T5xsrPKYJ_3vV5u3-k1hw9j_AK2Tp2cHXqBplsnbEtBMETGx8Vsft-_cfRU/exec";

document.addEventListener("DOMContentLoaded", init);

async function init(){
  // Accept both the new (?teamA,?teamB) and old (?team,?with) param styles
  const p = new URLSearchParams(location.search);
  const teamA = p.get("teamA") || p.get("team");
  const teamB = p.get("teamB") || p.get("with");

  if (!teamA || !teamB) {
    document.body.innerHTML = `<p style="text-align:center; margin-top:50px;">Invalid rivalry link.</p>`;
    return;
  }

  el("rivalryTitle").textContent = `${teamA} 🆚 ${teamB}`;

  let games = [];
  try {
    games = await fetch(scriptURL + "?action=loadGames").then(r=>r.json());
  } catch (e) {
    console.error(e);
    document.body.innerHTML = `<p style="text-align:center; margin-top:50px;">Failed to load games.</p>`;
    return;
  }

  // Filter rivalry games
  const rivalryGames = games.filter(g =>
    (g.Team === teamA && g.OpponentTeamName === teamB) ||
    (g.Team === teamB && g.OpponentTeamName === teamA)
  );

  if (!rivalryGames.length) {
    el("rivalrySummary").innerHTML = `<div class="stat-card"><div class="stat-label">Info</div><div class="stat-value">No matchups yet.</div></div>`;
    return;
  }

  // Aggregate head-to-head from A's perspective
  const head = {
    gp:0, wA:0, wB:0, regWA:0, regWB:0, etWA:0, etWB:0, soWA:0, soWB:0,
    gfA:0, gaA:0, gdA:0
  };
  const recent = [];

  rivalryGames.forEach(g => {
    let aHome = false;
    if (g.Team === teamA && g.OpponentTeamName === teamB) aHome = true;
    else if (g.Team === teamB && g.OpponentTeamName === teamA) aHome = false;
    else return;

    head.gp++;
    const gfA = aHome ? num(g.TeamGoals) : num(g.GoalsConceded);
    const gaA = aHome ? num(g.GoalsConceded) : num(g.TeamGoals);
    head.gfA += gfA;
    head.gaA += gaA;
    head.gdA += (gfA - gaA);

    const gt = String(g.GameType || "");
    const aWin = gfA > gaA;
    if (aWin) head.wA++; else head.wB++;

    if (gt.startsWith("Reg") || gt === "Regular") {
      if (aWin) head.regWA++; else head.regWB++;
    } else if (gt.startsWith("Extra") || gt === "ExtraTime") {
      if (aWin) head.etWA++; else head.etWB++;
    } else if (gt.startsWith("Shoot") || gt === "Shootout") {
      if (aWin) head.soWA++; else head.soWB++;
    }

    const result = aWin ? ((gt === "Shootout" || gt === "ExtraTime") ? "WE" : "W") : "L";
    recent.push({
      id: g.GameID,
      date: g.Date,
      score: `${gfA} - ${gaA}`,
      resultA: result
    });
  });

  // Summary
  const avgGFA = head.gp ? (head.gfA / head.gp).toFixed(2) : "0.00";
  const avgDiff = head.gp ? (head.gdA / head.gp).toFixed(2) : "0.00";
  const winDiff = head.wA - head.wB;

  el("rivalrySummary").innerHTML = [
    card("Games Played", head.gp),
    card("Win Difference", winDiff),
    card(`${teamA} Wins`, head.wA),
    card(`${teamB} Wins`, head.wB),
    card(`${teamA} Avg GF/G`, avgGFA),
    card("Avg Goal Diff (A)", avgDiff),
    card("Goal Difference (A)", head.gdA)
  ].join("");

  // Breakdown
  el("rivalryBreakdown").innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Team</th>
          <th>Reg Wins</th>
          <th>ET Wins</th>
          <th>SO Wins</th>
          <th>Total Wins</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${escapeHtml(teamA)}</td>
          <td>${head.regWA}</td>
          <td>${head.etWA}</td>
          <td>${head.soWA}</td>
          <td>${head.wA}</td>
        </tr>
        <tr>
          <td>${escapeHtml(teamB)}</td>
          <td>${head.regWB}</td>
          <td>${head.etWB}</td>
          <td>${head.soWB}</td>
          <td>${head.wB}</td>
        </tr>
      </tbody>
    </table>
  `;

  // Recent 5
  recent.sort((a,b)=> new Date(b.date) - new Date(a.date));
  const wrap = el("rivalryRecentGames");
  wrap.innerHTML = "";
  recent.slice(0,5).forEach(r => {
    const cls = r.resultA === "W" ? "win" : r.resultA === "WE" ? "we" : "loss";
    const txt = r.resultA === "WE" ? `W<span class="extra-time">(e)</span>` : r.resultA;
    wrap.insertAdjacentHTML("beforeend", `
      <div class="recent-game-card">
        <div class="result-tag ${cls}">${txt}</div>
        <div class="game-info">
          <div class="game-line">📅 ${fmtYYMMDD(r.date)}</div>
          <div class="game-line">🏒 ${r.score}</div>
          <div class="game-link"><a href="game.html?id=${r.id}">🔍 View</a></div>
        </div>
      </div>
    `);
  });
}

/* helpers */
function el(id){ return document.getElementById(id); }
function num(v){ const n = Number(v||0); return isNaN(n)?0:n; }
function fmtYYMMDD(s){
  const d = new Date(s);
  if (!isNaN(d)) {
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth()+1).padStart(2,"0");
    const dd = String(d.getDate()).padStart(2,"0");
    return `${yy}/${mm}/${dd}`;
  }
  return s;
}
function card(label, value){
  return `<div class="stat-card"><div class="stat-label">${label}</div><div class="stat-value">${value}</div></div>`;
}
function escapeHtml(s){
  return String(s||"").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}
