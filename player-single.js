const scriptURL = "https://script.google.com/macros/s/AKfycbyZ7XbB0T5xsrPKYJ_3vV5u3-k1hw9j_AK2Tp2cHXqBplsnbEtBMETGx8Vsft-_cfRU/exec";

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const playerId = urlParams.get("playerId");

  if (!playerId) {
    document.getElementById("playerName").innerText = "Player not found";
    return;
  }

  const [playersRes, playerStatsRes, gamesRes] = await Promise.all([
    fetch(scriptURL + "?action=loadTeamsAndPlayers"),
    fetch(scriptURL + "?action=loadPlayerStats"),
    fetch(scriptURL + "?action=loadGames")
  ]);

  const playersData = await playersRes.json();
  const playerStatsData = await playerStatsRes.json();
  const gamesData = await gamesRes.json();

  const player = playersData.players.find(p => String(p.PlayerID) === String(playerId));
  if (!player) {
    document.getElementById("playerName").innerText = "Player not found";
    return;
  }

  const playerName = player.PlayerName;
  const playerTeam = player.Team;
  const playerPosition = player.PositionMain || "-";

  document.getElementById("playerName").innerHTML = `<div class="player-name">${playerName}</div>`;
  document.getElementById("teamName").innerHTML = `<div class="team-name">${playerTeam}</div>`;
  document.getElementById("playerPosition").innerHTML = `<div class="player-position">${playerPosition}</div>`;

  const thisPlayerStats = playerStatsData.filter(stat => String(stat.PlayerID) === String(playerId));

  let totalGoals = 0, totalAssists = 0, totalGames = 0;
  let homeStats = { goals: 0, assists: 0, games: 0 };
  let awayStats = { goals: 0, assists: 0, games: 0 };
  let cleanSheets = 0, noGoals = 0;

  thisPlayerStats.forEach(stat => {
    const goals = Number(stat.Goals || 0);
    const assists = Number(stat.Assists || 0);
    const game = gamesData.find(g => g.GameID === stat.GameID);
    const isHome = game && game.Team === playerTeam;

    totalGoals += goals;
    totalAssists += assists;
    totalGames++;

    if (isHome) {
      homeStats.goals += goals;
      homeStats.assists += assists;
      homeStats.games++;
    } else {
      awayStats.goals += goals;
      awayStats.assists += assists;
      awayStats.games++;
    }

    if (isHome && Number(game.GoalsConceded) === 0) cleanSheets++;
    if (isHome && Number(game.TeamGoals) === 0) noGoals++;
  });

  const totalPoints = totalGoals + totalAssists;
  const avgGoals = totalGames ? (totalGoals / totalGames).toFixed(2) : "0.00";
  const avgAssists = totalGames ? (totalAssists / totalGames).toFixed(2) : "0.00";
  const avgPoints = totalGames ? (totalPoints / totalGames).toFixed(2) : "0.00";

  document.getElementById("totalStats").innerHTML = `
    <div class="stat-card"><div class="stat-label">Games</div><div class="stat-value">${totalGames}</div></div>
    <div class="stat-card"><div class="stat-label">Goals</div><div class="stat-value">${totalGoals}</div></div>
    <div class="stat-card"><div class="stat-label">Assists</div><div class="stat-value">${totalAssists}</div></div>
    <div class="stat-card"><div class="stat-label">Points</div><div class="stat-value">${totalPoints}</div></div>
    <div class="stat-card"><div class="stat-label">Clean Sheets</div><div class="stat-value">${cleanSheets}</div></div>
    <div class="stat-card"><div class="stat-label">No Goals</div><div class="stat-value">${noGoals}</div></div>
  `;

  document.getElementById("avgStats").innerHTML = `
    <div class="stat-card"><div class="stat-label">Avg Goals</div><div class="stat-value">${avgGoals}</div></div>
    <div class="stat-card"><div class="stat-label">Avg Assists</div><div class="stat-value">${avgAssists}</div></div>
    <div class="stat-card"><div class="stat-label">Avg Points</div><div class="stat-value">${avgPoints}</div></div>
  `;

  document.getElementById("homeStats").innerHTML = `
    <div><strong>Games:</strong> ${homeStats.games}</div>
    <div><strong>Goals:</strong> ${homeStats.goals}</div>
    <div><strong>Assists:</strong> ${homeStats.assists}</div>
    <div><strong>Points:</strong> ${homeStats.goals + homeStats.assists}</div>
  `;
  document.getElementById("awayStats").innerHTML = `
    <div><strong>Games:</strong> ${awayStats.games}</div>
    <div><strong>Goals:</strong> ${awayStats.goals}</div>
    <div><strong>Assists:</strong> ${awayStats.assists}</div>
    <div><strong>Points:</strong> ${awayStats.goals + awayStats.assists}</div>
  `;

  const recentContainer = document.getElementById("recentGames");
  recentContainer.innerHTML = "";
  thisPlayerStats.sort((a, b) => new Date(b.Date) - new Date(a.Date));
  thisPlayerStats.slice(0, 5).forEach(stat => {
    const div = document.createElement("div");
    div.className = "recent-game";
    div.innerHTML = `
      vs ${stat.OpponentTeamName}<br>
      Goals: ${stat.Goals}, Assists: ${stat.Assists}
    `;
    recentContainer.appendChild(div);
  });

  const shootoutStats = { attempts: 0, goals: 0 };
  thisPlayerStats.forEach(stat => {
    shootoutStats.attempts += Number(stat.ShootoutAttempts || 0);
    shootoutStats.goals += Number(stat.ShootoutGoals || 0);
  });

  const shootoutGoalPct = shootoutStats.attempts
    ? ((shootoutStats.goals / shootoutStats.attempts) * 100).toFixed(1)
    : "0.0";

    const shootoutDiv = document.createElement("div");
    shootoutDiv.innerHTML = `
      <h3>Shootout Stats</h3>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">Attempts</div>
          <div class="stat-value">${shootoutStats.attempts}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Goals</div>
          <div class="stat-value">${shootoutStats.goals}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Goal %</div>
          <div class="stat-value">${shootoutGoalPct}%</div>
        </div>
      </div>
    `;
    document.body.appendChild(shootoutDiv);
    
});
