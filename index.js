const scriptURL = "https://script.google.com/macros/s/AKfycbyZ7XbB0T5xsrPKYJ_3vV5u3-k1hw9j_AK2Tp2cHXqBplsnbEtBMETGx8Vsft-_cfRU/exec";

function renderStandings(games) {
  const standings = {};

  games.forEach(game => {
    const {
      Team,
      OpponentTeamName,
      OpponentType,
      TeamGoals,
      GoalsConceded,
      TeamPoints,
      OpponentPoints
    } = game;

    const teamGoals = parseInt(TeamGoals || 0);
    const goalsConceded = parseInt(GoalsConceded || 0);
    const teamPoints = parseInt(TeamPoints || 0);
    const opponentPoints = parseInt(OpponentPoints || 0);

    // Team
    if (!standings[Team]) {
      standings[Team] = { points: 0, games: 0, goals: 0, conceded: 0 };
    }
    standings[Team].games++;
    standings[Team].points += teamPoints;
    standings[Team].goals += teamGoals;
    standings[Team].conceded += goalsConceded;

    // Tracked Opponent
    if (OpponentType === "Tracked") {
      const opp = OpponentTeamName;
      if (!standings[opp]) {
        standings[opp] = { points: 0, games: 0, goals: 0, conceded: 0 };
      }
      standings[opp].games++;
      standings[opp].points += opponentPoints;
      standings[opp].goals += goalsConceded;
      standings[opp].conceded += teamGoals;
    }
  });

  // Add goal difference
  Object.values(standings).forEach(teamStats => {
    teamStats.goalDifference = teamStats.goals - teamStats.conceded;
  });

  // Convert to array and sort
  const standingsArray = Object.entries(standings).map(([team, stats]) => ({
    team,
    ...stats
  }));

  standingsArray.sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points;
    } else {
      return b.goalDifference - a.goalDifference;
    }
  });

  // Render
  const tbody = document.querySelector("#standingsTable tbody");
  tbody.innerHTML = "";

  standingsArray.forEach((teamData, index) => {
    const row = `<tr>
      <td>${index + 1}</td>
      <td><a href="team.html?teamName=${teamData.team}" class="team-link">${teamData.team}</a></td>
      <td>${teamData.games}</td>
      <td>${teamData.points}</td>
      <td>${teamData.goalDifference}</td>
      <td>${teamData.goals}</td>
      <td>${teamData.conceded}</td>
    </tr>`;
    tbody.innerHTML += row;
  });
}

loadGames();


async function loadGames() {
  try {
    const response = await fetch(scriptURL + "?action=loadGames");
    const games = await response.json();
    renderStandings(games);
    renderLast5Games(games);  // ✅ Moved here so it has access to `games`
  } catch (err) {
    console.error("Failed to load games:", err);
  }
}

function renderLast5Games(games) {
  const container = document.getElementById("last5GamesContainer");
  container.innerHTML = "";

  // Sort games by date descending
  const sortedGames = [...games].sort((a, b) => new Date(b.Date) - new Date(a.Date));

  sortedGames.slice(0, 5).forEach(game => {
    const teamName = game.Team;
    const opponentName = game.OpponentTeamName;
    const teamGoals = Number(game.TeamGoals || 0);
    const goalsConceded = Number(game.GoalsConceded || 0);
    const gameType = game.GameType;

    let result = "L";
    if (teamGoals > goalsConceded) {
      result = gameType === "Shootout" || gameType === "ExtraTime" ? "WE" : "W";
    }

    let resultClass = result === "W" ? "win" : result === "WE" ? "we" : "loss";
    let resultText = result === "WE" ? `W<span class="extra-time">(e)</span>` : result;

    const card = document.createElement("div");
    card.className = "recent-game-card";

    card.innerHTML = `
    <div class="game-info">
    <div class="game-line">🏟️ ${teamName} vs ${opponentName}</div>
    <div class="result-tag ${resultClass}">${resultText}</div>
        <div class="game-line">📅 ${game.Date}</div>
        <div class="game-line">🏒 ${teamGoals} - ${goalsConceded}</div>
        <div class="game-link"><a href="game.html?id=${game.GameID}">🔍 View</a></div>
      </div>
    `;
    

    container.appendChild(card);
  });
}

