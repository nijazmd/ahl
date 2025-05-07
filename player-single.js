const scriptURL = "https://script.google.com/macros/s/AKfycbxZgB9L1yZWjXTAuqJb1zzTnE74WRRYufPquzsmkWfTEMVjfVmCnhRAeBY3eJY5FOG0lQ/exec";


document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const playerId = urlParams.get("playerId");

  if (!playerId) {
    document.getElementById("playerName").innerText = "Player not found";
    return;
  }

  // Fetching the data for the player and their stats
  const [playersRes, playerStatsRes] = await Promise.all([
    fetch(scriptURL + "?action=loadTeamsAndPlayers"),
    fetch(scriptURL + "?action=loadPlayerStats")
  ]);

  const playersData = await playersRes.json();
  const playerStatsData = await playerStatsRes.json();

  // Find the player details
  const player = playersData.players.find(p => String(p.PlayerID) === String(playerId));
  if (!player) {
    document.getElementById("playerName").innerText = "Player not found";
    return;
  }

  const playerName = player.PlayerName;
  const playerTeam = player.Team;
  const playerPosition = player.PositionMain || "-";

  // Displaying player info
  document.getElementById("playerName").innerHTML = `<div class="player-name">${playerName}</div>`;
  document.getElementById("teamName").innerHTML = `<div class="team-name">${playerTeam}</div>`;
  document.getElementById("playerPosition").innerHTML = `<div class="player-position">${playerPosition}</div>`;

  // --- Player Total Stats ---
  const thisPlayerStats = playerStatsData.filter(stat => String(stat.PlayerID) === String(playerId));

  let totalGoals = 0, totalAssists = 0, totalPlus = 0, totalGames = 0, totalWins = 0;

  thisPlayerStats.forEach(stat => {
    totalGoals += Number(stat.Goals || 0);
    totalAssists += Number(stat.Assists || 0);
    totalPlus += Number(stat.PlusMinus || 0);
    totalGames++;

    const teamGoals = Number(stat.TeamGoals || 0);
    const goalsConceded = Number(stat.GoalsConceded || 0);
    if (teamGoals > goalsConceded) {
      totalWins++;
    }
  });

  const totalPoints = totalGoals + totalAssists;
  const avgGoals = totalGames ? (totalGoals / totalGames).toFixed(2) : "0.00";
  const avgAssists = totalGames ? (totalAssists / totalGames).toFixed(2) : "0.00";
  const avgPoints = totalGames ? (totalPoints / totalGames).toFixed(2) : "0.00";
  const avgPlus = totalGames ? (totalPlus / totalGames).toFixed(2) : "0.00";

  // --- Display Totals ---
  document.getElementById("totalStats").innerHTML = `
    <div><strong>Total Games:</strong> ${totalGames}</div>
    <div><strong>Goals:</strong> ${totalGoals}</div>
    <div><strong>Assists:</strong> ${totalAssists}</div>
    <div><strong>Points:</strong> ${totalPoints}</div>
    <div><strong>Plus/Minus Avg.:</strong> ${avgPlus}</div>
    <div><strong>Wins:</strong> ${totalWins}</div>
  `;

  // --- Display Averages ---
  document.getElementById("avgStats").innerHTML = `
    <div><strong>Avg. Goals/Game:</strong> ${avgGoals}</div>
    <div><strong>Avg. Assists/Game:</strong> ${avgAssists}</div>
    <div><strong>Avg. Points/Game:</strong> ${avgPoints}</div>
  `;

  // --- Display Recent Games ---
  thisPlayerStats.sort((a, b) => new Date(b.Date) - new Date(a.Date));
  const recentContainer = document.getElementById("recentGames");
  recentContainer.innerHTML = "";
  
  // Display only the opponent team name (away team)
  thisPlayerStats.slice(0, 5).forEach(stat => {
    const div = document.createElement("div");
    div.className = "recent-game";
  
    // Check if the date is valid and format it
    const gameDate = stat.Date ? new Date(stat.Date).toLocaleDateString() : "Date unavailable"; // Default if no date
    
    div.innerHTML = `
      vs ${stat.OpponentTeamName}<br>
      Goals: ${stat.Goals}, Assists: ${stat.Assists}, Plus/Minus: ${stat.PlusMinus}
    `;
    
    recentContainer.appendChild(div);
  });
  

 
});
