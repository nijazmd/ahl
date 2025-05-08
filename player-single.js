const scriptURL = "https://script.google.com/macros/s/AKfycbxZgB9L1yZWjXTAuqJb1zzTnE74WRRYufPquzsmkWfTEMVjfVmCnhRAeBY3eJY5FOG0lQ/exec";

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const playerId = urlParams.get("playerId");

  if (!playerId) {
    document.getElementById("playerName").innerText = "Player not found";
    return;
  }

  // ⬇️ Now also fetching Games
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

  let totalGoals = 0, totalAssists = 0, totalPlus = 0, totalGames = 0;

  // ✅ Create Home and Away stat trackers
  let homeStats = { goals: 0, assists: 0, plus: 0, games: 0 };
  let awayStats = { goals: 0, assists: 0, plus: 0, games: 0 };

  thisPlayerStats.forEach(stat => {
    const goals = Number(stat.Goals || 0);
    const assists = Number(stat.Assists || 0);
    const plus = Number(stat.PlusMinus || 0);
    const game = gamesData.find(g => g.GameID === stat.GameID);
    const isHome = game && game.Team === playerTeam;

    totalGoals += goals;
    totalAssists += assists;
    totalPlus += plus;
    totalGames++;

    

    if (isHome) {
      homeStats.goals += goals;
      homeStats.assists += assists;
      homeStats.plus += plus;
      homeStats.games++;
    } else {
      awayStats.goals += goals;
      awayStats.assists += assists;
      awayStats.plus += plus;
      awayStats.games++;
    }
  });

  const totalPoints = totalGoals + totalAssists;
  const avgGoals = totalGames ? (totalGoals / totalGames).toFixed(2) : "0.00";
  const avgAssists = totalGames ? (totalAssists / totalGames).toFixed(2) : "0.00";
  const avgPoints = totalGames ? (totalPoints / totalGames).toFixed(2) : "0.00";
  const avgPlus = totalGames ? (totalPlus / totalGames).toFixed(2) : "0.00";

  document.getElementById("totalStats").innerHTML = `
  <div class="stat-card"><div class="stat-label">Games</div><div class="stat-value">${totalGames}</div></div>
  <div class="stat-card"><div class="stat-label">Goals</div><div class="stat-value">${totalGoals}</div></div>
  <div class="stat-card"><div class="stat-label">Assists</div><div class="stat-value">${totalAssists}</div></div>
  <div class="stat-card"><div class="stat-label">Points</div><div class="stat-value">${totalPoints}</div></div>
  <div class="stat-card"><div class="stat-label">Plus/Minus</div><div class="stat-value">${avgPlus}</div></div>
`;


document.getElementById("avgStats").innerHTML = `
  <div class="stat-card"><div class="stat-label">Avg Goals</div><div class="stat-value">${avgGoals}</div></div>
  <div class="stat-card"><div class="stat-label">Avg Assists</div><div class="stat-value">${avgAssists}</div></div>
  <div class="stat-card"><div class="stat-label">Avg Points</div><div class="stat-value">${avgPoints}</div></div>
`;


  // ✅ Display Home and Away breakdown
  const homeHTML = `
    <div><strong>Games:</strong> ${homeStats.games}</div>
    <div><strong>Goals:</strong> ${homeStats.goals}</div>
    <div><strong>Assists:</strong> ${homeStats.assists}</div>
    <div><strong>Points:</strong> ${homeStats.goals + homeStats.assists}</div>
    <div><strong>Plus/Minus:</strong> ${homeStats.plus}</div>
  `;
  const awayHTML = `
    <div><strong>Games:</strong> ${awayStats.games}</div>
    <div><strong>Goals:</strong> ${awayStats.goals}</div>
    <div><strong>Assists:</strong> ${awayStats.assists}</div>
    <div><strong>Points:</strong> ${awayStats.goals + awayStats.assists}</div>
    <div><strong>Plus/Minus:</strong> ${awayStats.plus}</div>
  `;

  document.getElementById("homeStats").innerHTML = homeHTML;
  document.getElementById("awayStats").innerHTML = awayHTML;

  // --- Display Recent Games ---
  thisPlayerStats.sort((a, b) => new Date(b.Date) - new Date(a.Date));
  const recentContainer = document.getElementById("recentGames");
  recentContainer.innerHTML = "";

  thisPlayerStats.slice(0, 5).forEach(stat => {
    const div = document.createElement("div");
    div.className = "recent-game";

    const gameDate = stat.Date ? new Date(stat.Date).toLocaleDateString() : "Date unavailable";

    div.innerHTML = `
      vs ${stat.OpponentTeamName}<br>
      Goals: ${stat.Goals}, Assists: ${stat.Assists}, Plus/Minus: ${stat.PlusMinus}
    `;

    recentContainer.appendChild(div);
  });
});
