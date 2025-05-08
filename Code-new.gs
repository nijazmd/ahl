function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Sheets
    const gamesSheet = ss.getSheetByName("Games");
    const statsSheet = ss.getSheetByName("PlayerStats");

    // Extract POST data
    const data = e.parameter;
    const playerStats = JSON.parse(data.PlayerStats);

    // Generate GameID (timestamp-based unique ID)
    const gameId = "G" + Date.now();

    const shootOutAttempts = data.shootOutAttempts || '';
const shootOutGoals = data.shootOutGoals || '';
const shootOutGoalsConceded = data.shootOutGoalsConceded || '';


    // Insert into Games sheet
    const gameRow = [
  gameId,
  data.Date,
  data.Team,
  data.Opponent,
  data.OpponentType,
  data.OpponentTeamName,
  data.RegularTime,
  Number(data.TeamGoals),
  Number(data.GoalsConceded),
  data.CleanSheet === "TRUE" ? true : false,
  data.NoGoal === "TRUE" ? true : false
];

    gamesSheet.appendRow(gameRow);

    // Insert into PlayerStats sheet
    playerStats.forEach(p => {
      // If this is a player from the opponent team, swap Team and OpponentTeamName
      let team = data.Team;
      let opponentTeam = data.OpponentTeamName;
      
      if (p.Team !== data.Team) {
        // For opponent players, swap team and opponent
        team = data.OpponentTeamName;
        opponentTeam = data.Team;
      }

      const statRow = [
  gameId,
  p.PlayerID,
  team,
  opponentTeam,
  Number(p.Goals),
  Number(p.Assists),
  p.CleanSheet === "TRUE" ? true : false,
  p.NoGoal === "TRUE" ? true : false
];

      statsSheet.appendRow(statRow);
    });

    return ContentService.createTextOutput("Game and Player Stats added successfully.");
  } catch (error) {
    return ContentService.createTextOutput("Error: " + error.message);
  }
}


function doGet(e) {
  const action = e.parameter.action;

  if (action === "loadTeamsAndPlayers") {
    return loadTeamsAndPlayers();
  }

  if (action === "loadGames") {
    return loadGames(); // ✅ new function to load Games data
  }

  else if (action === "loadPlayerStats") {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("PlayerStats");
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const stats = data.map(row => {
    const stat = {};
    headers.forEach((h, i) => stat[h] = row[i]);
    return stat;
  });
  return ContentService.createTextOutput(JSON.stringify(stats)).setMimeType(ContentService.MimeType.JSON);
} else {
  return ContentService.createTextOutput("Invalid request").setMimeType(ContentService.MimeType.TEXT);
}


}


function loadTeamsAndPlayers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const teamsSheet = ss.getSheetByName("Teams");
  const playersSheet = ss.getSheetByName("Players");

  const teams = teamsSheet.getDataRange().getValues().slice(1).map(row => row[0]);
  const players = playersSheet.getDataRange().getValues().slice(1).map(row => ({
    PlayerID: row[0],
    PlayerName: row[1],
    Team: row[2],
    PositionMain: row[3],
    PositionSub: row[4],
    Line: row[5]
  }));

  return ContentService
    .createTextOutput(JSON.stringify({ teams, players }))
    .setMimeType(ContentService.MimeType.JSON);
}

function loadGames() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Games");
  const data = sheet.getDataRange().getValues();
  const headers = data.shift(); // First row as keys

  const games = data.map(row => {
    let obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i];
    });
    return obj;
  });

  return ContentService.createTextOutput(JSON.stringify(games))
    .setMimeType(ContentService.MimeType.JSON);
}


