const scriptURL = "https://script.google.com/macros/s/AKfycbyZ7XbB0T5xsrPKYJ_3vV5u3-k1hw9j_AK2Tp2cHXqBplsnbEtBMETGx8Vsft-_cfRU/exec";

let allPlayers = [];     // from Players sheet
let playerTotals = [];   // from PlayerTotals sheet
let mergedRows = [];     // joined + computed
let currentSort = { key: "points", dir: "desc" }; // default sort

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    const [teamsPlayers, totals] = await Promise.all([
      fetch(scriptURL + "?action=loadTeamsAndPlayers").then(r=>r.json()),
      fetch(scriptURL + "?action=loadPlayerTotals").then(r=>r.json()),
    ]);

    allPlayers = teamsPlayers.players || [];
    playerTotals = totals || [];

    mergeData();
    sortRows();
    renderTable(mergedRows);

    // Search UX: select all on focus; filter on input using lowercased fields
    const search = document.getElementById("playerSearch");
    search.addEventListener("focus", e => e.target.select());
    search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      const filtered = q
        ? mergedRows.filter(r =>
            r.nameLower.includes(q) ||
            r.teamLower.includes(q) ||
            r.posLower.includes(q)
          )
        : mergedRows;
      renderTable(filtered);
    });

    // Sort on header click
    document.querySelectorAll("#playersTable thead th").forEach(th => {
      th.style.cursor = "pointer";
      th.addEventListener("click", () => {
        const key = th.getAttribute("data-key");
        if (!key) return;
        if (currentSort.key === key) {
          currentSort.dir = currentSort.dir === "asc" ? "desc" : "asc";
        } else {
          currentSort.key = key;
          // sensible defaults: text asc, numbers desc for Points/Goals/etc
          currentSort.dir = isNumericKey(key) ? "desc" : "asc";
        }
        sortRows();
        // apply search after sort so visible rows stay filtered
        const q = search.value.trim().toLowerCase();
        const filtered = q
          ? mergedRows.filter(r =>
              r.nameLower.includes(q) ||
              r.teamLower.includes(q) ||
              r.posLower.includes(q)
            )
          : mergedRows;
        renderTable(filtered);
        paintSortIndicators();
      });
    });
    paintSortIndicators();
  } catch (err) {
    console.error("Failed to load players:", err);
  }
}

function isNumericKey(key) {
  return ["points","ptAvg","games","goals","assists"].includes(key);
}

function mergeData() {
  const byId = Object.fromEntries(allPlayers.map(p => [String(p.PlayerID), p]));

  mergedRows = playerTotals.map(t => {
    const pid = String(t.PlayerID);
    const p = byId[pid] || {};
    const name = (p.PlayerName || t.PlayerName || "").trim();
    const team = (p.Team || t.Team || "").trim(); // AHLClub in loader
    const position = (p.PositionMain || t.PositionMain || "").trim();

    const games   = toNum(t.Games);
    const goals   = toNum(t.Goals);
    const assists = toNum(t.Assists);
    const points  = goals + assists;
    const ptAvg   = games > 0 ? (points / games) : 0;

    return {
      id: pid,
      // display fields
      name, team, position,
      games, goals, assists, points, ptAvg,
      // lowercased for search
      nameLower: name.toLowerCase(),
      teamLower: team.toLowerCase(),
      posLower: position.toLowerCase(),
    };
  });
}

function toNum(v) { const n = Number(v || 0); return isNaN(n) ? 0 : n; }

function sortRows() {
  const { key, dir } = currentSort;
  mergedRows.sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (isNumericKey(key)) {
      const diff = (bv - av);
      return dir === "asc" ? -diff : diff;
    } else {
      const diff = String(av).localeCompare(String(bv), undefined, { sensitivity: "base" });
      return dir === "asc" ? diff : -diff;
    }
  });
}

function renderTable(rows) {
  const tbody = document.querySelector("#playersTable tbody");
  tbody.innerHTML = "";
  rows.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><a href="player-single.html?playerId=${encodeURIComponent(r.id)}">${escapeHtml(r.name)}</a></td>
      <td>${escapeHtml(r.team)}</td>
      <td>${escapeHtml(r.position || "-")}</td>
      <td>${r.points}</td>
      <td>${r.ptAvg.toFixed(2)}</td>
      <td>${r.games}</td>
      <td>${r.goals}</td>
      <td>${r.assists}</td>
    `;
    tbody.appendChild(tr);
  });
}

function paintSortIndicators() {
  document.querySelectorAll("#playersTable thead th").forEach(th => {
    const key = th.getAttribute("data-key");
    if (!key) return;
    const isActive = key === currentSort.key;
    const arrow = isActive ? (currentSort.dir === "asc" ? " ▲" : " ▼") : "";
    th.textContent = th.textContent.replace(/\s[▲▼]$/,''); // strip old
    th.textContent = th.textContent.split(" ")[0] + arrow; // re-apply
  });
}

// Small helper to avoid accidental HTML injection from names
function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}
