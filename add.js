const scriptURL = "https://script.google.com/macros/s/AKfycbyAQ6CT2FCud7g3wX4Huaz1lDydreoBtp3AgbuMCxv0fdDWX-oRvLPNZ47puHpwk7vlog/exec";

const POINTS_CONFIG = {
  RegulationWin: 2,
  RegulationLoss: 0,
  ExtratimeWin: 2,
  ExtratimeLoss: 1,
  ShootoutWin: 2,
  ShootoutLoss: 1
};

let allPlayers = [];
let allTeams = [];

window.onload = async () => {
  await loadTeamsAndPlayers();
  populateTeamDropdowns();
  populatePlayerInputs();
  handleOpponentChange();

  // Toggle shootout stats visibility
  document.querySelectorAll('input[name="reg"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const isShootout = document.querySelector('input[name="reg"]:checked').value === "Shootout";
      document.getElementById("shootoutStats").style.display = isShootout ? "block" : "none";
    });
  });

  // Set today's date as default
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("date").value = today;

  document.getElementById("team").addEventListener("change", function() {
    populatePlayerInputs(); // Re-populate player inputs for the selected home team
    updateGoals(); // Update Team Goals based on the selected team
  });
};

// Function to load teams and players data
function loadTeamsAndPlayers() {
  return fetch(scriptURL + "?action=loadTeamsAndPlayers")
    .then(response => response.json())
    .then(data => {
      allTeams = data.teams;
      allPlayers = data.players;
      console.log("Teams and Players loaded successfully:", allTeams, allPlayers); // TESTING
    })
    .catch(error => console.error("Failed to load data:", error));
}

// Function to populate team dropdowns
function populateTeamDropdowns() {
  const teamSelect = document.getElementById("team");
  const opponentSelect = document.getElementById("opponent");

  teamSelect.innerHTML = "";
  opponentSelect.innerHTML = '<option value="Other">Other</option>';

  allTeams.forEach(team => {
    const opt1 = new Option(team, team);
    const opt2 = new Option(team, team);
    teamSelect.appendChild(opt1);
    opponentSelect.appendChild(opt2);
  });
}

// Function to render players in the selected team or opponent team
function renderPlayers(playersList, containerId, prefix) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  playersList.forEach(p => {
    const div = document.createElement("div");
    div.innerHTML = `
      <strong>${p.PlayerName}</strong> (ID: ${p.PlayerID})<br>
      Goals: <input type="number" value="0" id="${prefix}_g_${p.PlayerID}" oninput="updateGoals()">
      Assists: <input type="number"  value="0" id="${prefix}_a_${p.PlayerID}">
      <br><br>`;
    container.appendChild(div);
  });
}

// Function to calculate and update Team Goals and Goals Conceded
function updateGoals() {
  const team = document.getElementById("team").value;
  const opponent = document.getElementById("opponent").value;

  // Calculate Team Goals (sum of goals by team players)
  const teamPlayers = allPlayers.filter(p => p.Team === team);
  const teamGoals = teamPlayers.reduce((sum, p) => {
    return sum + parseInt(document.getElementById("team_g_" + p.PlayerID).value || 0);
  }, 0);
  document.getElementById("teamGoals").value = teamGoals;

  // Calculate Goals Conceded (sum of goals by opponent players)
  let goalsConceded = 0;
  if (opponent !== "Other") {
    const opponentPlayers = allPlayers.filter(p => p.Team === opponent);
    goalsConceded = opponentPlayers.reduce((sum, p) => {
      return sum + parseInt(document.getElementById("opponent_g_" + p.PlayerID).value || 0);
    }, 0);
  }
  document.getElementById("goalsConceded").value = goalsConceded;
}

// Populate player inputs for the selected team
function populatePlayerInputs() {
  const team = document.getElementById("team").value;
  const teamPlayers = allPlayers.filter(p => p.Team === team);
  renderPlayers(teamPlayers, "teamPlayers", "team");
  updateGoals();  // Update Team Goals when players are populated
}

// Handle opponent selection change
function handleOpponentChange() {
  const opponent = document.getElementById("opponent").value;
  const otherContainer = document.getElementById("otherTeamContainer");
  const opponentPlayersContainer = document.getElementById("opponentPlayersContainer");

  if (opponent === "Other") {
    otherContainer.style.display = "block";
    opponentPlayersContainer.style.display = "none";
  } else {
    otherContainer.style.display = "none";
    opponentPlayersContainer.style.display = "block";

    const players = allPlayers.filter(p => p.Team === opponent);
    renderPlayers(players, "opponentPlayers", "opponent");
    updateGoals();  // Update Goals when opponent is changed
  }
}

// Submit the form with game data
async function submitForm(event) {
  event.preventDefault();

  const team = document.getElementById("team").value;
  const opponentValue = document.getElementById("opponent").value;
  const opponentType = opponentValue === "Other" ? "Other" : "Tracked";
  const opponentName = opponentType === "Other"
    ? document.getElementById("otherTeamName").value
    : opponentValue;

  const gameType = document.querySelector('input[name="reg"]:checked').value;
  const isShootout = gameType === "Shootout";

  // Initialize data object
  const data = {
    Date: document.getElementById("date").value,
    Team: team,
    Opponent: opponentValue,
    OpponentType: opponentType,
    OpponentTeamName: opponentName,
    GameType: gameType,
    TeamGoals: document.getElementById("teamGoals").value,
    GoalsConceded: document.getElementById("goalsConceded").value,
    ShootOutData: isShootout ? {
      teamShootOutAttempts: document.getElementById("teamShootOutAttempts").value,
      teamSOGoals: document.getElementById("teamSOGoals").value,
      oppShootOutAttempts: document.getElementById("oppShootOutAttempts").value,
      oppSOGoals: document.getElementById("oppSOGoals").value
    } : null,
    PlayerStats: []  // This will store player statistics
  };

  // Calculate points based on the game result
  const teamGoals = parseInt(data.TeamGoals || 0);
  const goalsConceded = parseInt(data.GoalsConceded || 0);
  let teamPoints = 0;
  let opponentPoints = 0;

  if (teamGoals > goalsConceded) {
    teamPoints = gameType === "Regulation" ? POINTS_CONFIG.RegulationWin :
                 gameType === "ExtraTime" ? POINTS_CONFIG.ExtratimeWin :
                 POINTS_CONFIG.ShootoutWin;
    opponentPoints = gameType === "Regulation" ? POINTS_CONFIG.RegulationLoss :
                     gameType === "ExtraTime" ? POINTS_CONFIG.ExtratimeLoss :
                     POINTS_CONFIG.ShootoutLoss;
  } else if (teamGoals < goalsConceded) {
    teamPoints = gameType === "Regulation" ? POINTS_CONFIG.RegulationLoss :
                 gameType === "ExtraTime" ? POINTS_CONFIG.ExtratimeLoss :
                 POINTS_CONFIG.ShootoutLoss;
    opponentPoints = gameType === "Regulation" ? POINTS_CONFIG.RegulationWin :
                     gameType === "ExtraTime" ? POINTS_CONFIG.ExtratimeWin :
                     POINTS_CONFIG.ShootoutWin;
  }

  // Add the calculated points to the data object
  data.TeamPoints = teamPoints;
  data.OpponentPoints = opponentPoints;

  // Collect player stats for the team
  const teamPlayers = allPlayers.filter(p => p.Team === team);
  teamPlayers.forEach(p => {
    data.PlayerStats.push({
      PlayerID: p.PlayerID,
      Team: team,
      Opponent: opponentName,
      Goals: document.getElementById("team_g_" + p.PlayerID).value,
      Assists: document.getElementById("team_a_" + p.PlayerID).value,
    });
  });

  // If opponent is tracked, collect their player stats too
  if (opponentType === "Tracked") {
    const oppPlayers = allPlayers.filter(p => p.Team === opponentName);
    oppPlayers.forEach(p => {
      data.PlayerStats.push({
        PlayerID: p.PlayerID,
        Team: opponentName,
        Opponent: team,
        Goals: document.getElementById("opponent_g_" + p.PlayerID).value,
        Assists: document.getElementById("opponent_a_" + p.PlayerID).value
      });
    });
  }

  // Submit the data to Google Sheets
  const params = new URLSearchParams();
  for (const key in data) {
    if (key === "PlayerStats" || key === "ShootOutData") {
      params.append(key, JSON.stringify(data[key]));
    } else {
      params.append(key, data[key]);
    }
  }

  try {
    const response = await fetch(scriptURL, {
      method: "POST",
      body: params
    });

    const text = await response.text();
    alert(text); // Notify user of success
  } catch (err) {
    alert("Error submitting data: " + err.message); // Handle any errors
  }
}
