const scriptURL = "https://script.google.com/macros/s/AKfycbyAQ6CT2FCud7g3wX4Huaz1lDydreoBtp3AgbuMCxv0fdDWX-oRvLPNZ47puHpwk7vlog/exec";

async function loadGames() {
  try {
    const response = await fetch(scriptURL + "?action=loadGames");
    const games = await response.json();
    renderStandings(games);
  } catch (err) {
    console.error("Failed to load games:", err);
  }
}

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
      <td>${teamData.points}</td>
      <td>${teamData.goals}</td>
      <td>${teamData.conceded}</td>
      <td>${teamData.goalDifference}</td>
    </tr>`;
    tbody.innerHTML += row;
  });
}


loadGames();
