const scriptURL = "https://script.google.com/macros/s/AKfycbxZgB9L1yZWjXTAuqJb1zzTnE74WRRYufPquzsmkWfTEMVjfVmCnhRAeBY3eJY5FOG0lQ/exec";

let allGames = [];
let allPlayers = [];
let playerStatsData = [];

document.addEventListener("DOMContentLoaded", async () => {
  const teamSelect = document.getElementById("teamSelect");
  const urlParams = new URLSearchParams(window.location.search);
  const selectedTeam = urlParams.get("team");

  const [teamsRes, playersRes, gamesRes, playerStatsRes] = await Promise.all([
    fetch(scriptURL + "?action=loadTeamsAndPlayers"),
    fetch(scriptURL + "?action=loadTeamsAndPlayers"),
    fetch(scriptURL + "?action=loadGames"),
    fetch(scriptURL + "?action=loadPlayerStats")
  ]);

  const teamsData = await teamsRes.json();
  const gamesData = await gamesRes.json();
  const playersData = await playersRes.json();
  playerStatsData = await playerStatsRes.json();

  allPlayers = playersData.players;
  allGames = gamesData;

  teamsData.teams.forEach(team => {
    const opt = document.createElement("option");
    opt.value = team;
    opt.textContent = team;
    if (selectedTeam === team) opt.selected = true;
    teamSelect.appendChild(opt);
  });

  loadTeamData();
});

function loadTeamData() {
  const team = document.getElementById("teamSelect").value;
  const teamStats = {
    games: 0,
    wins: 0,
    regWins: 0,
    etWins: 0,
    losses: 0,
    goals: 0,
    conceded: 0,
    recent: []
  };

  const recentGames = [];

  allGames.forEach(game => {
    const isTeam = game.Team === team;
    const isOpponent = game.OpponentType === "Tracked" && game.OpponentTeamName === team;

    if (isTeam || isOpponent) {
      const isHome = isTeam;
      const teamGoals = parseInt(isHome ? game.TeamGoals : game.GoalsConceded);
      const goalsConceded = parseInt(isHome ? game.GoalsConceded : game.TeamGoals);
      const regular = game.RegularTime === "Yes";
      const result = teamGoals > goalsConceded ? (regular ? "W" : "WE") : "L";

      teamStats.games++;
      teamStats.goals += teamGoals;
      teamStats.conceded += goalsConceded;

      if (result === "W") {
        teamStats.wins++;
        teamStats.regWins++;
      } else if (result === "WE") {
        teamStats.wins++;
        teamStats.etWins++;
      } else {
        teamStats.losses++;
      }

      recentGames.push({
        GameID: game.GameID,
        date: game.Date,
        opponent: isHome ? game.OpponentTeamName : game.Team,
        result,
        teamGoals,
        goalsConceded
      });
    }
  });

  const container = document.getElementById("teamStatsContainer");
  const avgGoals = (teamStats.goals / teamStats.games).toFixed(2);
  const avgConceded = (teamStats.conceded / teamStats.games).toFixed(2);
  
  // Calculate the Win Percentages
  const winPct = (teamStats.wins / teamStats.games * 100).toFixed(1);
  const regWinPct = (teamStats.regWins / teamStats.games * 100).toFixed(1);

  container.innerHTML = `
    <div><strong>Games Played:</strong> ${teamStats.games}</div>
    <div><strong>Wins:</strong> ${teamStats.wins}</div>
    <div><strong>Regular Wins:</strong> ${teamStats.regWins}</div>
    <div><strong>Extra Time Wins:</strong> ${teamStats.etWins}</div>
    <div><strong>Losses:</strong> ${teamStats.losses}</div>
    <div><strong>Goals Scored:</strong> ${teamStats.goals}</div>
    <div><strong>Goals Conceded:</strong> ${teamStats.conceded}</div>
    <div><strong>Goal Difference:</strong> ${teamStats.goals - teamStats.conceded}</div>
    <div><strong>Average Goals/Game:</strong> ${avgGoals}</div>
    <div><strong>Average Goals Conceded/Game:</strong> ${avgConceded}</div>
    <div><strong>Win %:</strong> ${winPct}%</div>
    <div><strong>Regular Time Win %:</strong> ${regWinPct}%</div>
  `;

  // --- PLAYER STATS ---
  const tableBody = document.getElementById("playerStatsTable");
  tableBody.innerHTML = "";

  const playerStatsMap = {};
  playerStatsData.forEach(stat => {
    if (stat.Team !== team) return;
    const pid = stat.PlayerID;
    if (!playerStatsMap[pid]) {
      playerStatsMap[pid] = { goals: 0, assists: 0, plus: 0 };
    }
    playerStatsMap[pid].goals += Number(stat.Goals || 0);
    playerStatsMap[pid].assists += Number(stat.Assists || 0);
    playerStatsMap[pid].plus += Number(stat.PlusMinus || 0);
  });

  const players = allPlayers.filter(p => p.Team === team);
  const playerStats = players.map(p => {
    const stats = playerStatsMap[p.PlayerID] || { goals: 0, assists: 0, plus: 0 };
    return {
      id: p.PlayerID,
      name: p.PlayerName,
      position: p.PositionMain || "-",
      goals: stats.goals,
      assists: stats.assists,
      plus: stats.plus,
      points: stats.goals + stats.assists
    };
  });

  playerStats.sort((a, b) => b.points - a.points);
  playerStats.forEach(p => {
    const row = `<tr>
      <td><a href="player-single.html?playerId=${p.id}">${p.name}</a></td>
      <td>${p.position}</td>
      <td>${p.goals}</td>
      <td>${p.assists}</td>
      <td>${p.plus}</td>
      <td>${p.points}</td>
    </tr>`;
    tableBody.innerHTML += row;
  });

  // --- RECENT GAMES ---
  const recentGamesContainer = document.getElementById("recentGamesContainer");
  recentGames.sort((a, b) => new Date(b.date) - new Date(a.date));
  recentGamesContainer.innerHTML = "";

  recentGames.slice(0, 5).forEach(game => {
    const gameDiv = document.createElement("div");
    gameDiv.className = "recent-game";
    gameDiv.innerHTML = `
      <div><strong>Date:</strong> ${game.date}</div>
      <div><strong>Opponent:</strong> ${game.opponent}</div>
      <div><strong>Result:</strong> ${game.result}</div>
      <div><strong>Score:</strong> ${game.teamGoals} - ${game.goalsConceded}</div>
      <div><a href="game.html?id=${game.GameID}">View</a></div>
    `;
    recentGamesContainer.appendChild(gameDiv);
  });

  // --- LAST 5 GAME SUMMARY ---
  const summaryContainer = document.getElementById("gameSummaryContainer");
  summaryContainer.innerHTML = "";
  recentGames.slice(0, 5).forEach(game => {
    const tag = document.createElement("div");
    tag.className = `game-tag ${game.result}`;
    tag.textContent = game.result;
    summaryContainer.appendChild(tag);
  });
}
