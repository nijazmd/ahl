const scriptURL = "https://script.google.com/macros/s/AKfycbyZ7XbB0T5xsrPKYJ_3vV5u3-k1hw9j_AK2Tp2cHXqBplsnbEtBMETGx8Vsft-_cfRU/exec";

let allGames = [];
let allPlayers = [];
let playerStatsData = [];

document.addEventListener("DOMContentLoaded", async () => {
  const teamRadioContainer = document.getElementById("teamRadioContainer");
const urlParams = new URLSearchParams(window.location.search);
const selectedTeamFromURL = urlParams.get("teamName");


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
    const id = `team_${team}`;
    const label = document.createElement("label");
    label.htmlFor = id;
    label.innerHTML = `
      <input type="radio" name="teamRadio" id="${id}" value="${team}" ${selectedTeamFromURL === team ? "checked" : ""}>
      ${team}
    `;
    teamRadioContainer.appendChild(label);
  });
  
  document.querySelectorAll('input[name="teamRadio"]').forEach(radio => {
    radio.addEventListener("change", loadTeamData);
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

  // Reset global stat accumulators before reloading team data
cleanSheets = 0;
noGoals = 0;
shootoutAttempts = 0;
shootoutGoals = 0;
oppShootoutAttempts = 0;
oppShootoutGoals = 0;

  let homeSOAttempts = 0;
let homeSOGoals = 0;
let homeOppSOGoals = 0;

let awaySOAttempts = 0;
let awaySOGoals = 0;
let awayOppSOGoals = 0;

  const team = document.querySelector('input[name="teamRadio"]:checked')?.value;
if (!team) return;

  const teamStats = {
    games: 0,
    wins: 0,
    regWins: 0,
    etWins: 0,
    soWins: 0,
    losses: 0,
    goals: 0,
    conceded: 0,
    recent: []
  };

  const homeStats = {
    games: 0, wins: 0, regWins: 0, etWins: 0, soWins: 0, losses: 0, goals: 0, conceded: 0
  };
  const awayStats = {
    games: 0, wins: 0, regWins: 0, etWins: 0, soWins: 0, losses: 0, goals: 0, conceded: 0
  };
  

  const recentGames = [];

  allGames.forEach(game => {
    const isTeam = game.Team === team;
    const isOpponent = game.OpponentType === "Tracked" && game.OpponentTeamName === team;
       
    if (isTeam || isOpponent) {
      const isHome = isTeam;
      const gameType = game.GameType;
      const teamGoals = parseInt(isHome ? game.TeamGoals : game.GoalsConceded);
      const goalsConceded = parseInt(isHome ? game.GoalsConceded : game.TeamGoals);
      const target = isHome ? homeStats : awayStats;
      let result = "L";
    

if (gameType === "Shootout") {
  let soGoals = 0;
  let oppGoals = 0;

  if (isTeam) {
    soGoals = Number(game.TeamSOGoals || 0);
    oppGoals = Number(game.OpponentSOGoals || 0);
  } else {
    soGoals = Number(game.OpponentSOGoals || 0);
    oppGoals = Number(game.TeamSOGoals || 0);
  }

  if (soGoals > oppGoals) {
    teamStats.soWins++;
    target.soWins++;
    teamStats.wins++;
    target.wins++;
    result = "WE";
  } else {
    teamStats.losses++;
    target.losses++;
  }
} else if (teamGoals > goalsConceded) {
  teamStats.wins++;
  target.wins++;

  if (gameType === "Regular") {
    teamStats.regWins++;
    target.regWins++;
    result = "W";
  } else if (gameType === "ExtraTime") {
    teamStats.etWins++;
    target.etWins++;
    result = "WE";
  }
} else {
  teamStats.losses++;
  target.losses++;
}


      

      teamStats.games++;
      teamStats.goals += teamGoals;
      teamStats.conceded += goalsConceded;

      target.games++;
      target.goals += teamGoals;
      target.conceded += goalsConceded;
      
      
      

      recentGames.push({
        GameID: game.GameID,
        date: game.Date,
        opponent: isHome ? game.OpponentTeamName : game.Team,
        result,
        teamGoals,
        goalsConceded
      });

            // Count clean sheets and no goals (only for home games)
            if (isTeam || isOpponent) {
              const teamGoals = Number(game.TeamGoals);
              const goalsConceded = Number(game.GoalsConceded);
            
              if (goalsConceded === 0) cleanSheets++;
              if (teamGoals === 0) noGoals++;
            
              
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

  <div class="stat-section">
    <h3 class="stat-heading">Overview</h3>
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-label">Games Played</div><div class="stat-value">${teamStats.games}</div></div>
      <div class="stat-card"><div class="stat-label">Wins</div><div class="stat-value">${teamStats.wins}</div></div>
      <div class="stat-card"><div class="stat-label">Losses</div><div class="stat-value">${teamStats.losses}</div></div>
    </div>
  </div>

  <div class="stat-section">
    <h3 class="stat-heading">Scores</h3>
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-label">Goals Scored</div><div class="stat-value">${teamStats.goals}</div></div>
      <div class="stat-card"><div class="stat-label">Goals Conceded</div><div class="stat-value">${teamStats.conceded}</div></div>
      <div class="stat-card"><div class="stat-label">Goal Difference</div><div class="stat-value">${teamStats.goals - teamStats.conceded}</div></div>
      <div class="stat-card"><div class="stat-label">Avg Goals/Game</div><div class="stat-value">${avgGoals}</div></div>
      <div class="stat-card"><div class="stat-label">Avg Goals Conceded</div><div class="stat-value">${avgConceded}</div></div>
    </div>
  </div>

  <div class="stat-section">
    <h3 class="stat-heading">Averages</h3>
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-label">Win %</div><div class="stat-value">${winPct}%</div></div>
      <div class="stat-card"><div class="stat-label">Reg Time Win %</div><div class="stat-value">${regWinPct}%</div></div>
      <div class="stat-card"><div class="stat-label">Shootout Win %</div><div class="stat-value">${
        teamStats.soWins ? ((teamStats.soWins / teamStats.games) * 100).toFixed(1) : "0.0"
      }%</div></div>
    </div>
  </div>

  <div class="stat-section">
    <h3 class="stat-heading">Wins</h3>
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-label">Regulation Wins</div><div class="stat-value">${teamStats.regWins}</div></div>
      <div class="stat-card"><div class="stat-label">Extra Time Wins</div><div class="stat-value">${teamStats.etWins}</div></div>
      <div class="stat-card"><div class="stat-label">Shootout Wins</div><div class="stat-value">${teamStats.soWins}</div></div>
    </div>
  </div>

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
        <div><strong>Shootout Wins:</strong> ${homeStats.soWins}</div>
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
        <div><strong>Shootout Wins:</strong> ${awayStats.soWins}</div>
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



  // ---- SHOOTOUT STATS BASED ON PLAYER STATS ----
  shootoutAttempts = 0;
  shootoutGoals = 0;
  oppShootoutAttempts = 0;
  oppShootoutGoals = 0;

  playerStatsData.forEach(stat => {
    if (stat.Team === team) {
      shootoutAttempts += Number(stat.ShootoutAttempts || 0);
      shootoutGoals += Number(stat.ShootoutGoals || 0);
    }
    if (stat.OpponentTeamName === team) {
      oppShootoutAttempts += Number(stat.ShootoutAttempts || 0);
      oppShootoutGoals += Number(stat.ShootoutGoals || 0);
    }
  });

  const shootoutGoalPct = shootoutAttempts
  ? ((shootoutGoals / shootoutAttempts) * 100).toFixed(1)
  : "0.0";
const denialPct = oppShootoutAttempts
  ? (((oppShootoutAttempts - oppShootoutGoals) / oppShootoutAttempts) * 100).toFixed(1)
  : "0.0";

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
    const stats = playerStatsMap[p.PlayerID] || { goals: 0, assists: 0 };
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
