document.addEventListener("DOMContentLoaded", function () {
    const scriptURL = "https://script.google.com/macros/s/AKfycbyZ7XbB0T5xsrPKYJ_3vV5u3-k1hw9j_AK2Tp2cHXqBplsnbEtBMETGx8Vsft-_cfRU/exec";
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get("id");
  
    async function loadGameDetails() {
      try {
        const [gamesRes, playerStatsRes, playersRes] = await Promise.all([
          fetch(`${scriptURL}?action=loadGames`),
          fetch(`${scriptURL}?action=loadPlayerStats`),
          fetch(`${scriptURL}?action=loadTeamsAndPlayers`)
        ]);
  
        const games = await gamesRes.json();
        const playerStats = await playerStatsRes.json();
        const players = await playersRes.json();
  
        const game = games.find(g => g.GameID === gameId);
        if (!game) {
          document.getElementById("gameInfoContainer").innerHTML = "<p>Game not found.</p>";
          return;
        }
  
        renderGameInfo(game);
        renderPlayerStats(gameId, playerStats, players.players);
      } catch (err) {
        console.error("Error loading data:", err);
        document.getElementById("gameInfoContainer").innerHTML = "<p>Error loading game details.</p>";
      }
    }
  
    function renderGameInfo(game) {
      document.getElementById("gameDate").innerHTML = game.Date;
      document.getElementById("teamName").innerHTML = game.Team;
      document.getElementById("opponentName").innerHTML = game.OpponentTeamName;
      document.getElementById("teamGoals").innerHTML = game.TeamGoals;
      document.getElementById("goalsConceded").innerHTML = game.GoalsConceded;
      document.getElementById("gameType").innerHTML = game.GameType;
  
      const result = parseInt(game.TeamGoals) > parseInt(game.GoalsConceded) ? "Win" : "Loss";
      document.getElementById("gameResult").innerHTML = result;
    }
  
    function renderPlayerStats(gameId, playerStatsData, players) {
        const container = document.getElementById("playerStatsContainer");
        const filteredStats = playerStatsData.filter(stat => stat.GameID === gameId);
      
        if (filteredStats.length === 0) {
          container.innerHTML = "<p>No player stats available for this game.</p>";
          return;
        }
      
        const playerMap = {};
        players.forEach(p => {
          playerMap[p.PlayerID] = p.PlayerName;
        });
      
        // Calculate points for sorting
        const statsWithPoints = filteredStats.map(stat => ({
          ...stat,
          PlayerName: playerMap[stat.PlayerID] || "Unknown",
          Goals: Number(stat.Goals || 0),
          Assists: Number(stat.Assists || 0),
          Points: Number(stat.Goals || 0) + Number(stat.Assists || 0)
        }));
      
        statsWithPoints.sort((a, b) => b.Points - a.Points);
      
        let html = `
          <h3>Player Stats</h3>
          <table class="player-stats-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Team</th>
                <th>Goals</th>
                <th>Assists</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
        `;
      
        statsWithPoints.forEach(stat => {
          html += `
            <tr>
              <td>${stat.PlayerName}</td>
              <td>${stat.Team}</td>
              <td>${stat.Goals}</td>
              <td>${stat.Assists}</td>
              <td>${stat.Points}</td>
            </tr>
          `;
        });
      
        html += "</tbody></table>";
        container.innerHTML = html;
      }
      
  
    loadGameDetails();
  });
  