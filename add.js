const scriptURL = "https://script.google.com/macros/s/AKfycbxZgB9L1yZWjXTAuqJb1zzTnE74WRRYufPquzsmkWfTEMVjfVmCnhRAeBY3eJY5FOG0lQ/exec";

let allPlayers = [];
let allTeams = [];


window.onload = async () => {
    await loadTeamsAndPlayers();
    populateTeamDropdowns();
    populatePlayerInputs();
    handleOpponentChange();
  
    document.getElementById("team").addEventListener("change", () => {
      populatePlayerInputs();
      handleOpponentChange();
    });
  
    document.getElementById("opponent").addEventListener("change", handleOpponentChange);
  
    // Set today's date as default
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("date").value = today;
  };
  

// Function to load teams and players data
function loadTeamsAndPlayers() {
  return fetch(scriptURL + "?action=loadTeamsAndPlayers")
    .then(response => response.json())
    .then(data => {
      allTeams = data.teams;
      allPlayers = data.players;
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

// ✅ Function to render players in the selected team or opponent team
function renderPlayers(playersList, containerId, prefix) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  playersList.forEach(p => {
    const div = document.createElement("div");
    div.innerHTML = `
      <strong>${p.PlayerName}</strong> (ID: ${p.PlayerID})<br>
      Goals: <input type="number" value="0" id="${prefix}_g_${p.PlayerID}" oninput="updateGoals()">
      Assists: <input type="number"  value="0" id="${prefix}_a_${p.PlayerID}">
      Plus/Minus: <input type="number"  value="0" id="${prefix}_pm_${p.PlayerID}">
      <br><br>`;
    container.appendChild(div);
  });
}

// ✅ Function to calculate and update Team Goals and Goals Conceded
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

  const data = {
    Date: document.getElementById("date").value,
    Team: team,
    Opponent: opponentValue,
    OpponentType: opponentType,
    OpponentTeamName: opponentName,
    RegularTime: document.querySelector('input[name="reg"]:checked').value,
    TeamGoals: document.getElementById("teamGoals").value,
    GoalsConceded: document.getElementById("goalsConceded").value,
    PlayerStats: []
  };

  // Collecting stats for home team (team selected in "team" dropdown)
  const teamPlayers = allPlayers.filter(p => p.Team === team);
  teamPlayers.forEach(p => {
    data.PlayerStats.push({
      PlayerID: p.PlayerID,
      Team: team,
      Opponent: opponentName,
      Goals: document.getElementById("team_g_" + p.PlayerID).value,
      Assists: document.getElementById("team_a_" + p.PlayerID).value,
      PlusMinus: document.getElementById("team_pm_" + p.PlayerID).value
    });
  });

  // Collecting stats for opponent team
  if (opponentType === "Tracked") {
    const oppPlayers = allPlayers.filter(p => p.Team === opponentName);
    oppPlayers.forEach(p => {
      data.PlayerStats.push({
        PlayerID: p.PlayerID,
        Team: opponentName,
        Opponent: team,
        Goals: document.getElementById("opponent_g_" + p.PlayerID).value,
        Assists: document.getElementById("opponent_a_" + p.PlayerID).value,
        PlusMinus: document.getElementById("opponent_pm_" + p.PlayerID).value
      });
    });
  }

  const params = new URLSearchParams();
  for (const key in data) {
    if (key === "PlayerStats") {
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
    alert(text);
  } catch (err) {
    alert("Error submitting data: " + err.message);
  }
}
