const scriptURL = "https://script.google.com/macros/s/AKfycbyAQ6CT2FCud7g3wX4Huaz1lDydreoBtp3AgbuMCxv0fdDWX-oRvLPNZ47puHpwk7vlog/exec";

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

let cleanSheets = 0;
let noGoals = 0;

let shootoutAttempts = 0;
let shootoutGoals = 0;
let oppShootoutAttempts = 0;
let oppShootoutGoals = 0;


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

  const homeStats = {
    games: 0, wins: 0, regWins: 0, etWins: 0, losses: 0, goals: 0, conceded: 0
  };
  const awayStats = {
    games: 0, wins: 0, regWins: 0, etWins: 0, losses: 0, goals: 0, conceded: 0
  };
  

  const recentGames = [];

  allGames.forEach(game => {
    const isTeam = game.Team === team;
    const isOpponent = game.OpponentType === "Tracked" && game.OpponentTeamName === team;

    if (isTeam || isOpponent) {
      const isHome = isTeam;
      
      const teamGoals = parseInt(isHome ? game.TeamGoals : game.GoalsConceded);
      const goalsConceded = parseInt(isHome ? game.GoalsConceded : game.TeamGoals);
      const gameType = game.GameType;
      let result = "L";
      if (teamGoals > goalsConceded) {
        result = gameType === "Regular" ? "W" : "WE";
      }
      

      teamStats.games++;
      teamStats.goals += teamGoals;
      teamStats.conceded += goalsConceded;

      const target = isHome ? homeStats : awayStats;
      target.games++;
      target.goals += teamGoals;
      target.conceded += goalsConceded;


      if (result === "W") {
        teamStats.wins++;
        teamStats.regWins++;
        target.wins++;
        target.regWins++;
      } else if (result === "WE") {
        teamStats.wins++;
        teamStats.etWins++;
        target.wins++;
        target.etWins++;
      } else {
        teamStats.losses++;
        target.losses++;
      }
      
      
      

      recentGames.push({
        GameID: game.GameID,
        date: game.Date,
        opponent: isHome ? game.OpponentTeamName : game.Team,
        result,
        teamGoals,
        goalsConceded
      });

            // Count clean sheets and no goals (only for home games)
            if (isTeam) {
              if (Number(game.GoalsConceded) === 0) cleanSheets++;
              if (Number(game.TeamGoals) === 0) noGoals++;
      
              shootoutAttempts += Number(game.ShootoutAttempts || 0);
              shootoutGoals += Number(game.ShootoutGoals || 0);
              oppShootoutAttempts += Number(game.OpponentShootoutAttempts || 0);
              oppShootoutGoals += Number(game.OpponentShootoutGoals || 0);
            }
      
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
    <div><strong>Regulation Wins:</strong> ${teamStats.regWins}</div>
    <div><strong>Extra Time Wins:</strong> ${teamStats.etWins}</div>
    <div><strong>Losses:</strong> ${teamStats.losses}</div>
    <div><strong>Goals Scored:</strong> ${teamStats.goals}</div>
    <div><strong>Goals Conceded:</strong> ${teamStats.conceded}</div>
    <div><strong>Goal Difference:</strong> ${teamStats.goals - teamStats.conceded}</div>
    <div><strong>Average Goals/Game:</strong> ${avgGoals}</div>
    <div><strong>Average Goals Conceded/Game:</strong> ${avgConceded}</div>
    <div><strong>Win %:</strong> ${winPct}%</div>
    <div><strong>Regulation Time Win %:</strong> ${regWinPct}%</div>
  `;

  const homeGD = homeStats.goals - homeStats.conceded;
const awayGD = awayStats.goals - awayStats.conceded;
const homeAvgGoals = homeStats.games ? (homeStats.goals / homeStats.games).toFixed(2) : "0.00";
const awayAvgGoals = awayStats.games ? (awayStats.goals / awayStats.games).toFixed(2) : "0.00";
const homeAvgConceded = homeStats.games ? (homeStats.conceded / homeStats.games).toFixed(2) : "0.00";
const awayAvgConceded = awayStats.games ? (awayStats.conceded / awayStats.games).toFixed(2) : "0.00";


const homeAwayHTML = `
  <div class="split-columns">
    <div class="home-away-box">
      <h3>Home Performance</h3>
      <div class="split-stats">
        <div><strong>Games:</strong> ${homeStats.games}</div>
        <div><strong>Wins:</strong> ${homeStats.wins}</div>
        <div><strong>Reg Wins:</strong> ${homeStats.regWins}</div>
        <div><strong>ET Wins:</strong> ${homeStats.etWins}</div>
        <div><strong>Losses:</strong> ${homeStats.losses}</div>
        <div><strong>Goals:</strong> ${homeStats.goals}</div>
        <div><strong>Conceded:</strong> ${homeStats.conceded}</div>
        <div><strong>Goal Diff:</strong> ${homeGD}</div>
        <div><strong>Avg Goals:</strong> ${homeAvgGoals}</div>
        <div><strong>Avg Conceded:</strong> ${homeAvgConceded}</div>
      </div>
    </div>

    <div class="home-away-box">
      <h3>Away Performance</h3>
      <div class="split-stats">
        <div><strong>Games:</strong> ${awayStats.games}</div>
        <div><strong>Wins:</strong> ${awayStats.wins}</div>
        <div><strong>Reg Wins:</strong> ${awayStats.regWins}</div>
        <div><strong>ET Wins:</strong> ${awayStats.etWins}</div>
        <div><strong>Losses:</strong> ${awayStats.losses}</div>
        <div><strong>Goals:</strong> ${awayStats.goals}</div>
        <div><strong>Conceded:</strong> ${awayStats.conceded}</div>
        <div><strong>Goal Diff:</strong> ${awayGD}</div>
        <div><strong>Avg Goals:</strong> ${awayAvgGoals}</div>
        <div><strong>Avg Conceded:</strong> ${awayAvgConceded}</div>
      </div>
    </div>
  </div>
`;



container.innerHTML += homeAwayHTML;

const shootoutGoalPct = shootoutAttempts ? ((shootoutGoals / shootoutAttempts) * 100).toFixed(1) : "0.0";
const denialPct = oppShootoutAttempts ? (((oppShootoutAttempts - oppShootoutGoals) / oppShootoutAttempts) * 100).toFixed(1) : "0.0";

const advancedStatsContainer = document.getElementById("teamAdvancedStats");
advancedStatsContainer.innerHTML = `
  <div class="stat-card"><div class="stat-label">Clean Sheets</div><div class="stat-value">${cleanSheets}</div></div>
  <div class="stat-card"><div class="stat-label">No Goals</div><div class="stat-value">${noGoals}</div></div>
  <div class="stat-card"><div class="stat-label">Shootout Attempts</div><div class="stat-value">${shootoutAttempts}</div></div>
  <div class="stat-card"><div class="stat-label">Shootout Goals</div><div class="stat-value">${shootoutGoals}</div></div>
  <div class="stat-card"><div class="stat-label">Opponent Goals</div><div class="stat-value">${oppShootoutGoals}</div></div>
  <div class="stat-card"><div class="stat-label">Goal %</div><div class="stat-value">${shootoutGoalPct}%</div></div>
  <div class="stat-card"><div class="stat-label">Denial %</div><div class="stat-value">${denialPct}%</div></div>
`;


  // --- PLAYER STATS ---
  const tableBody = document.getElementById("playerStatsTable");
  tableBody.innerHTML = "";

  const playerStatsMap = {};
  playerStatsData.forEach(stat => {
    if (stat.Team !== team) return;
    const pid = stat.PlayerID;
    if (!playerStatsMap[pid]) {
      playerStatsMap[pid] = { goals: 0, assists: 0 };
    }
    playerStatsMap[pid].goals += Number(stat.Goals || 0);
    playerStatsMap[pid].assists += Number(stat.Assists || 0);
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
    gameDiv.className = "recent-game-card";
  
    // Format result text and color
    let resultText = "";
    let resultClass = "";
  
    if (game.result === "W") {
      resultText = "W";
      resultClass = "win";
    } else if (game.result === "WE") {
      resultText = `W<span class="extra-time">(e)</span>`;
      resultClass = "we";
    } else {
      resultText = "L";
      resultClass = "loss";
    }
  
    gameDiv.innerHTML = `
      <div class="result-tag ${resultClass}">${resultText}</div>
      <div class="game-info">
        <div class="game-line">📅 ${game.date}</div>
        <div class="game-line">🆚 ${game.opponent}</div>
        <div class="game-line">🏒 ${game.teamGoals} - ${game.goalsConceded}</div>
        <div class="game-link"><a href="game.html?id=${game.GameID}">🔍 View</a></div>
      </div>
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
