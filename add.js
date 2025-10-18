const scriptURL = "https://script.google.com/macros/s/AKfycbyZ7XbB0T5xsrPKYJ_3vV5u3-k1hw9j_AK2Tp2cHXqBplsnbEtBMETGx8Vsft-_cfRU/exec";

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
let otherOppSuggestions = []; // from past Games where OpponentType === "Other"

window.onload = async () => {
  await loadTeamsPlayersAndOppSuggestions();
  buildTeamRadios();
  populateOpponentDropdown();
  populatePlayerInputs();
  handleOpponentChange();

  // Toggle shootout stats area
  document.querySelectorAll('input[name="reg"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const isShootout = document.querySelector('input[name="reg"]:checked').value === "Shootout";
      document.getElementById("shootoutStats").style.display = isShootout ? "block" : "none";
      populatePlayerInputs();
      handleOpponentChange();
    });
  });

  // Today as default
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("date").value = today;

  // When team radio changes
  document.getElementById("teamRadioContainer").addEventListener("change", () => {
    populatePlayerInputs();
    updateGoals();
  });

  // Search inputs: auto-select text on focus
  ["teamSearch","opponentSearch"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("focus", e => e.target.select());
  });

  // Other team input: Title Case as you type + datalist suggestions
  const otherInp = document.getElementById("otherTeamName");
  otherInp.addEventListener("input", () => {
    otherInp.value = toTitleCase(otherInp.value);
  });
};

function getSelectedTeam() {
  return document.querySelector('input[name="teamRadio"]:checked')?.value || "";
}

async function loadTeamsPlayersAndOppSuggestions() {
  // teams & players
  const tp = await fetch(scriptURL + "?action=loadTeamsAndPlayers").then(r=>r.json());
  allTeams = tp.teams;
  allPlayers = tp.players;

  // build "Other" opponent suggestions from past Games
  try {
    const games = await fetch(scriptURL + "?action=loadGames").then(r=>r.json());
    const set = new Set();
    games.forEach(g => {
      if (String(g.OpponentType).toLowerCase() === "other" && g.OpponentTeamName) {
        set.add(String(g.OpponentTeamName));
      }
    });
    otherOppSuggestions = Array.from(set).sort((a,b)=>a.localeCompare(b, undefined, {sensitivity:"base"}));
  } catch(e) {
    otherOppSuggestions = [];
  }
}

function buildTeamRadios() {
  const wrap = document.getElementById("teamRadioContainer");
  wrap.innerHTML = "";
  allTeams.forEach(team => {
    const id = `team_${team}`;
    const label = document.createElement("label");
    label.className = "team-radio";
    label.setAttribute("for", id);
    label.innerHTML = `
      <input type="radio" name="teamRadio" id="${id}" value="${team}">
      <span>${team}</span>
    `;
    wrap.appendChild(label);
  });
  // default select first team
  const first = wrap.querySelector('input[type="radio"]');
  if (first) first.checked = true;
}

function populateOpponentDropdown() {
  const opponentSelect = document.getElementById("opponent");
  opponentSelect.innerHTML = '<option value="Other">Other</option>';
  allTeams.forEach(team => opponentSelect.appendChild(new Option(team, team)));

  // Fill datalist for Other suggestions
  const dl = document.getElementById("otherTeamSuggestions");
  dl.innerHTML = "";
  otherOppSuggestions.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    dl.appendChild(opt);
  });
}

function renderPlayers(playersList, containerId, prefix) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  const isShootout = document.querySelector('input[name="reg"]:checked')?.value === "Shootout";

  playersList
    .slice()
    .sort((a, b) => a.PlayerName.localeCompare(b.PlayerName, undefined, { sensitivity: "base" }))
    .forEach(p => {
      const div = document.createElement("div");
      div.classList.add("player-entry");
      div.dataset.name = p.PlayerName.toLowerCase();

      const pid = p.PlayerID;

      div.innerHTML = `
        <label style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
          <input type="checkbox" id="${prefix}_play_${pid}" checked>
          <strong>${p.PlayerName}</strong>
        </label>

        <div class="dual-input-row">
          <div class="input-group">
            <label>Goals</label>
            <div class="counter">
              <button type="button" onclick="adjust('${prefix}_g_${pid}', -1)">−</button>
              <input type="number" value="0" id="${prefix}_g_${pid}" oninput="updateGoals()">
              <button type="button" onclick="adjust('${prefix}_g_${pid}', 1)">+</button>
            </div>
          </div>

          <div class="input-group">
            <label>Assists</label>
            <div class="counter">
              <button type="button" onclick="adjust('${prefix}_a_${pid}', -1)">−</button>
              <input type="number" value="0" id="${prefix}_a_${pid}">
              <button type="button" onclick="adjust('${prefix}_a_${pid}', 1)">+</button>
            </div>
          </div>
        </div>

        ${isShootout ? `
          Shootout Attempt? <input type="checkbox" id="${prefix}_so_${pid}" onchange="toggleSO(${pid}, '${prefix}')">
          <span id="${prefix}_goal_label_${pid}" style="display:none">
            Goal Scored? <input type="checkbox" id="${prefix}_so_goal_${pid}" onchange="updateTeamShootoutStats()">
          </span><br>` : ""}
        <br>
      `;
      container.appendChild(div);

      // If unchecked, zero and disable fields
      const playCb = div.querySelector(`#${prefix}_play_${pid}`);
      const fields = ["g","a"].map(k => div.querySelector(`#${prefix}_${k}_${pid}`));
      playCb.addEventListener("change", () => {
        const on = playCb.checked;
        fields.forEach(f => {
          f.disabled = !on;
          if (!on) f.value = 0;
        });
        updateGoals();
        updateTeamShootoutStats();
      });
    });
}

function getPlayersForTeam(team) {
  return allPlayers.filter(p => p.Team === team);
}

// Team goals = sum of goals for CHECKED players only
function updateGoals() {
  const team = getSelectedTeam();
  const opponent = document.getElementById("opponent").value;

  const teamPlayers = getPlayersForTeam(team);
  const teamGoals = teamPlayers.reduce((sum, p) => {
    const play = document.getElementById(`team_play_${p.PlayerID}`);
    const el = document.getElementById(`team_g_${p.PlayerID}`);
    if (play?.checked) return sum + (parseInt(el?.value || 0) || 0);
    return sum;
  }, 0);
  document.getElementById("teamGoals").value = teamGoals;

  const concededInput = document.getElementById("goalsConceded");
  if (opponent !== "Other") {
    const opponentPlayers = getPlayersForTeam(opponent);
    const goalsConceded = opponentPlayers.reduce((sum, p) => {
      const play = document.getElementById(`opponent_play_${p.PlayerID}`);
      const el = document.getElementById(`opponent_g_${p.PlayerID}`);
      if (play?.checked) return sum + (parseInt(el?.value || 0) || 0);
      return sum;
    }, 0);
    concededInput.value = goalsConceded;
  }
}

function filterPlayers(prefix) {
  const term = document.getElementById(`${prefix}Search`).value.toLowerCase();
  const container = document.getElementById(`${prefix}Players`);
  const players = container.querySelectorAll('.player-entry');
  players.forEach(p => {
    const name = p.dataset.name;
    p.style.display = name.includes(term) ? "block" : "none";
  });
}

// SHOOTOUT
function toggleSO(playerId, prefix) {
  const label = document.getElementById(`${prefix}_goal_label_${playerId}`);
  const attemptChecked = document.getElementById(`${prefix}_so_${playerId}`).checked;
  label.style.display = attemptChecked ? "inline" : "none";
  updateTeamShootoutStats();
}

function updateTeamShootoutStats() {
  const team = getSelectedTeam();
  const opponent = document.getElementById("opponent").value;

  let teamAttempts = 0, teamGoals = 0;
  let oppAttempts = 0, oppGoals = 0;

  allPlayers.forEach(p => {
    // Team
    if (p.Team === team) {
      const play = document.getElementById("team_play_" + p.PlayerID);
      if (!play?.checked) return;
      const so = document.getElementById("team_so_" + p.PlayerID);
      const goal = document.getElementById("team_so_goal_" + p.PlayerID);
      if (so?.checked) {
        teamAttempts++;
        if (goal?.checked) teamGoals++;
      }
    }
    // Opponent
    if (opponent !== "Other" && p.Team === opponent) {
      const play = document.getElementById("opponent_play_" + p.PlayerID);
      if (!play?.checked) return;
      const so = document.getElementById("opponent_so_" + p.PlayerID);
      const goal = document.getElementById("opponent_so_goal_" + p.PlayerID);
      if (so?.checked) {
        oppAttempts++;
        if (goal?.checked) oppGoals++;
      }
    }
  });

  document.getElementById("teamShootOutAttempts").value = teamAttempts;
  document.getElementById("teamSOGoals").value = teamGoals;
  document.getElementById("oppShootOutAttempts").value = oppAttempts;
  document.getElementById("oppSOGoals").value = oppGoals;
}

// Populate player inputs for selected team/opponent
function populatePlayerInputs() {
  const team = getSelectedTeam();
  const teamPlayers = getPlayersForTeam(team);
  renderPlayers(teamPlayers, "teamPlayers", "team");
  updateGoals();
  updateTeamShootoutStats();
}

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

    const players = getPlayersForTeam(opponent);
    renderPlayers(players, "opponentPlayers", "opponent");
    updateGoals();
    updateTeamShootoutStats();
  }
}

function adjust(inputId, delta) {
  const input = document.getElementById(inputId);
  let value = parseInt(input.value) || 0;
  value = Math.max(0, value + delta);
  input.value = value;
  if (inputId.includes("_g_")) updateGoals();
}

async function submitForm(event) {
  event.preventDefault();

  const team = getSelectedTeam();
  const opponentValue = document.getElementById("opponent").value;
  const opponentType = opponentValue === "Other" ? "Other" : "Tracked";
  const opponentName = opponentType === "Other"
    ? document.getElementById("otherTeamName").value
    : opponentValue;

  const gameType = document.querySelector('input[name="reg"]:checked').value;
  const isShootout = gameType === "Shootout";

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
    PlayerStats: []
  };

  // Collect ONLY checked players
  const pushIfPlayed = (p, prefix, oppName) => {
    const played = document.getElementById(`${prefix}_play_${p.PlayerID}`)?.checked;
    if (!played) return;
    const attempt = document.getElementById(`${prefix}_so_${p.PlayerID}`);
    const goal = document.getElementById(`${prefix}_so_goal_${p.PlayerID}`);
    data.PlayerStats.push({
      PlayerID: p.PlayerID,
      Team: prefix === "team" ? team : oppName,
      Opponent: prefix === "team" ? oppName : team,
      Goals: document.getElementById(`${prefix}_g_${p.PlayerID}`).value,
      Assists: document.getElementById(`${prefix}_a_${p.PlayerID}`).value,
      ShootoutAttempts: attempt?.checked ? 1 : 0,
      ShootoutGoals: (attempt?.checked && goal?.checked) ? 1 : 0
    });
  };

  const teamPlayers = getPlayersForTeam(team);
  teamPlayers.forEach(p => pushIfPlayed(p, "team", opponentName));

  if (opponentType === "Tracked") {
    const oppPlayers = getPlayersForTeam(opponentName);
    oppPlayers.forEach(p => pushIfPlayed(p, "opponent", team));
  }

  // Submit
  const params = new URLSearchParams();
  for (const key in data) {
    if (key === "PlayerStats" || key === "ShootOutData") params.append(key, JSON.stringify(data[key]));
    else params.append(key, data[key]);
  }

  try {
    const response = await fetch(scriptURL, { method: "POST", body: params });
    const text = await response.text();
    alert(text);
  } catch (err) {
    alert("Error submitting data: " + err.message);
  }
}

/* ------- utils ------- */
function toTitleCase(str){
  return String(str).replace(/\S+/g, w => w[0]?.toUpperCase() + w.slice(1).toLowerCase());
}
