// game.js
const scriptURL = "https://script.google.com/macros/s/AKfycbyZ7XbB0T5xsrPKYJ_3vV5u3-k1hw9j_AK2Tp2cHXqBplsnbEtBMETGx8Vsft-_cfRU/exec";

let allGames = [];
let playerStats = [];
let allPlayers = [];

const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get("id");

if (gameId) loadGameDetails();

async function loadGameDetails() {
  try {
    const [gamesRes, statsRes, playersRes] = await Promise.all([
      fetch(scriptURL + "?action=loadGames"),
      fetch(scriptURL + "?action=loadPlayerStats"),
      fetch(scriptURL + "?action=loadTeamsAndPlayers")
    ]);

    const games = await gamesRes.json();
    playerStats = await statsRes.json();
    allPlayers = (await playersRes.json()).players;

    const game = games.find(g => g.GameID === gameId);
    if (!game) {
      document.getElementById("gameDetails").textContent = "Game not found.";
      return;
    }

    renderGameInfo(game);
    renderPlayerStats(game);

  } catch (err) {
    console.error("Error loading game details:", err);
  }
}

function renderGameInfo(game) {
  const infoDiv = document.getElementById("gameDetails");
  const resultText = `${game.TeamGoals} - ${game.GoalsConceded}`;

  infoDiv.innerHTML = `
    <h2>${game.Team} vs ${game.OpponentTeamName}</h2>
    <div class="info-line">📅 ${game.Date}</div>
    <div class="info-line">🏒 Final Score: ${resultText}</div>
    <div class="info-line">🎮 Game Type: ${game.GameType}</div>
    <div class="info-line">🧊 Regular Time: ${game.RegularTime || "N/A"}</div>
  `;
}

function renderPlayerStats(game) {
  const tableBody = document.getElementById("gamePlayerStats");
  tableBody.innerHTML = "";

  const playersInGame = playerStats.filter(ps => ps.GameID === game.GameID);

  playersInGame.forEach(ps => {
    const player = allPlayers.find(p => p.PlayerID === ps.PlayerID);
    const playerName = player ? player.PlayerName : ps.PlayerID;

    const row = `<tr>
      <td>${playerName}</td>
      <td>${ps.Team}</td>
      <td>${ps.Goals || 0}</td>
      <td>${ps.Assists || 0}</td>
      <td>${ps.PlusMinus || 0}</td>
      <td>${ps.ShootoutAttempts || 0}</td>
      <td>${ps.ShootoutGoals || 0}</td>
    </tr>`;

    tableBody.innerHTML += row;
  });
}
