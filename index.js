const scriptURL = "https://script.google.com/macros/s/AKfycbxZgB9L1yZWjXTAuqJb1zzTnE74WRRYufPquzsmkWfTEMVjfVmCnhRAeBY3eJY5FOG0lQ/exec";

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
    const { Team, OpponentTeamName, OpponentType, TeamGoals, GoalsConceded, RegularTime } = game;
    const teamGoals = parseInt(TeamGoals || 0);
    const goalsConceded = parseInt(GoalsConceded || 0);

    // Initialize standings for the team if not already present
    if (!standings[Team]) {
      standings[Team] = { points: 0, games: 0, goals: 0, conceded: 0 };
    }
    standings[Team].games++;
    standings[Team].goals += teamGoals;
    standings[Team].conceded += goalsConceded;

    // Update opponent team (if tracked)
    if (OpponentType === "Tracked") {
      if (!standings[OpponentTeamName]) {
        standings[OpponentTeamName] = { points: 0, games: 0, goals: 0, conceded: 0 };
      }
      standings[OpponentTeamName].games++;
      standings[OpponentTeamName].goals += goalsConceded;
      standings[OpponentTeamName].conceded += teamGoals;
    }

    // Calculate points based on game result
    if (RegularTime === "Yes") {
      // Win in regular time (2 points for the winner)
      if (teamGoals > goalsConceded) {
        standings[Team].points += 2;  // Win
      } else if (teamGoals < goalsConceded) {
        standings[OpponentTeamName].points += 2;  // Opponent win
      }
    } else {
      // Win in extra time (1 point for the winner)
      if (teamGoals > goalsConceded) {
        standings[Team].points += 1;  // Win
      } else {
        standings[OpponentTeamName].points += 1;  // Opponent win
      }
    }
  });

  // Calculate goal difference for each team
  Object.values(standings).forEach(teamStats => {
    teamStats.goalDifference = teamStats.goals - teamStats.conceded;
  });

  // Convert standings object to an array and sort based on points and goal difference
  const standingsArray = Object.entries(standings).map(([team, stats]) => ({
    team,
    ...stats
  }));

  standingsArray.sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points;  // Sort by points descending
    } else {
      return b.goalDifference - a.goalDifference;  // Sort by goal difference descending
    }
  });

  // Render the standings table
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


// function renderStandings(games) {
//   const standings = {};

//   games.forEach(game => {
//     const { Team, OpponentTeamName, OpponentType, TeamGoals, GoalsConceded, RegularTime } = game;
//     const teamGoals = parseInt(TeamGoals || 0);
//     const goalsConceded = parseInt(GoalsConceded || 0);

//     // Initialize standings for the team if not already present
//     if (!standings[Team]) {
//       standings[Team] = { points: 0, games: 0, goals: 0, conceded: 0 };
//     }
//     standings[Team].games++;
//     standings[Team].goals += teamGoals;
//     standings[Team].conceded += goalsConceded;

//     // Update opponent team (if tracked)
//     if (OpponentType === "Tracked") {
//       if (!standings[OpponentTeamName]) {
//         standings[OpponentTeamName] = { points: 0, games: 0, goals: 0, conceded: 0 };
//       }
//       standings[OpponentTeamName].games++;
//       standings[OpponentTeamName].goals += goalsConceded;
//       standings[OpponentTeamName].conceded += teamGoals;
//     }

//     // Calculate points based on game result
//     if (RegularTime === "Yes") {
//       // Win in regular time (2 points for the winner)
//       if (teamGoals > goalsConceded) {
//         standings[Team].points += 2;  // Win
//       } else if (teamGoals < goalsConceded) {
//         standings[OpponentTeamName].points += 2;  // Opponent win
//       }
//     } else {
//       // Win in extra time (1 point for the winner)
//       if (teamGoals > goalsConceded) {
//         standings[Team].points += 1;  // Win
//       } else {
//         standings[OpponentTeamName].points += 1;  // Opponent win
//       }
//     }
//   });

//   // Calculate goal difference for each team
//   Object.values(standings).forEach(teamStats => {
//     teamStats.goalDifference = teamStats.goals - teamStats.conceded;
//   });

//   // Convert standings object to an array and sort based on points and goal difference
//   const standingsArray = Object.entries(standings).map(([team, stats]) => ({
//     team,
//     ...stats
//   }));

//   standingsArray.sort((a, b) => {
//     if (b.points !== a.points) {
//       return b.points - a.points;  // Sort by points descending
//     } else {
//       return b.goalDifference - a.goalDifference;  // Sort by goal difference descending
//     }
//   });

//   // Render the standings table
//   const tbody = document.querySelector("#standingsTable tbody");
//   tbody.innerHTML = "";

//   standingsArray.forEach((teamData, index) => {
//     const row = `<tr>
//       <td>${index + 1}</td>
//       <td>${teamData.team}</td>
//       <td>${teamData.points}</td>
//       <td>${teamData.goals}</td>
//       <td>${teamData.conceded}</td>
//       <td>${teamData.goalDifference}</td>
//     </tr>`;
//     tbody.innerHTML += row;
//   });
// }

loadGames();
