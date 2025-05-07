const scriptURL = "https://script.google.com/macros/s/AKfycbxZgB9L1yZWjXTAuqJb1zzTnE74WRRYufPquzsmkWfTEMVjfVmCnhRAeBY3eJY5FOG0lQ/exec";

let allPlayers = [];
let playerStats = [];

document.addEventListener("DOMContentLoaded", async () => {
  const [playersRes, statsRes] = await Promise.all([
    fetch(scriptURL + "?action=loadTeamsAndPlayers"),
    fetch(scriptURL + "?action=loadPlayerStats")
  ]);

  const playersData = await playersRes.json();
  const statsData = await statsRes.json();

  allPlayers = playersData.players;
  playerStats = statsData;

  const aggregated = aggregateStats(allPlayers, playerStats);
  renderTable(aggregated);
  sortTableByColumn(5); // Default: sort by Points
});

// Combine player info and their stats
function aggregateStats(players, stats) {
  const statMap = {};

  stats.forEach(row => {
    const id = row.PlayerID;
    if (!statMap[id]) {
      statMap[id] = { goals: 0, assists: 0, plus: 0 };
    }
    statMap[id].goals += Number(row.Goals || 0);
    statMap[id].assists += Number(row.Assists || 0);
    statMap[id].plus += Number(row.PlusMinus || 0);
  });

  return players.map(p => {
    const s = statMap[p.PlayerID] || { goals: 0, assists: 0, plus: 0 };
    return {
      id: p.PlayerID,
      name: p.PlayerName,
      team: p.Team,
      goals: s.goals,
      assists: s.assists,
      plus: s.plus,
      points: s.goals + s.assists
    };
  });
}

function renderTable(data) {
  const tbody = document.querySelector("#allPlayersTable tbody");
  tbody.innerHTML = "";

  data.forEach(p => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><a href="player-single.html?playerId=${p.id}">${p.name}</a></td>
      <td>${p.team}</td>
      <td>${p.goals}</td>
      <td>${p.assists}</td>
      <td>${p.plus}</td>
      <td>${p.points}</td>
    `;
    tbody.appendChild(row);
  });
}

// Sorting table columns
function sortTable(colIndex) {
  const table = document.getElementById("allPlayersTable");
  const tbody = table.tBodies[0];
  const rows = Array.from(tbody.rows);

  const isNumber = !isNaN(rows[0].cells[colIndex].innerText);
  const ascending = !table.dataset.sortOrder || table.dataset.sortOrder === "desc";

  rows.sort((a, b) => {
    const aVal = a.cells[colIndex].innerText;
    const bVal = b.cells[colIndex].innerText;
    return isNumber
      ? (ascending ? aVal - bVal : bVal - aVal)
      : (ascending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal));
  });

  table.dataset.sortOrder = ascending ? "asc" : "desc";

  tbody.innerHTML = "";
  rows.forEach(row => tbody.appendChild(row));
}

// Helper to sort initially by column index
function sortTableByColumn(colIndex) {
  sortTable(colIndex);
}
