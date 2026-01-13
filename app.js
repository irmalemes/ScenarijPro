const express = require("express");
const fs = require("fs/promises");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "writing.html"));
});

const DATA_DIR = path.join(__dirname, "data");
const SCENARIOS_DIR = path.join(DATA_DIR, "scenarios");
const DELTAS_FILE = path.join(DATA_DIR, "deltas.json");

let lineLocks = []; 
let charLocks = []; 

async function initStorage() {
  await fs.mkdir(SCENARIOS_DIR, { recursive: true });
  try {
    await fs.access(DELTAS_FILE);
  } catch {
    await fs.writeFile(DELTAS_FILE, JSON.stringify([], null, 2));
  }
}


async function readScenario(id) {
  try {
    const data = await fs.readFile(
      path.join(SCENARIOS_DIR, `scenario-${id}.json`),
      "utf-8"
    );
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function writeScenario(id, scenario) {
  await fs.writeFile(
    path.join(SCENARIOS_DIR, `scenario-${id}.json`),
    JSON.stringify(scenario, null, 2)
  );
}

function now() {
  return Math.floor(Date.now() / 1000);
}


app.post("/api/scenarios", async (req, res) => {
  await initStorage();

  const title = req.body?.title || "Neimenovani scenarij";
  const files = await fs.readdir(SCENARIOS_DIR).catch(() => []);

  const ids = files
    .map(f => f.match(/scenario-(\d+)\.json/))
    .filter(Boolean)
    .map(m => Number(m[1]));

  const id = (ids.length ? Math.max(...ids) : 0) + 1;

  const scenario = {
    id,
    title,
    content: [{ lineId: 1, nextLineId: null, text: "" }]
  };

  await writeScenario(id, scenario);
  res.status(200).json(scenario);
});


app.post("/api/scenarios/:scenarioId/lines/:lineId/lock", async (req, res) => {
  const scenarioId = Number(req.params.scenarioId);
  const lineId = Number(req.params.lineId);
  const userId = Number(req.body.userId);

  const scenario = await readScenario(scenarioId);
  if (!scenario)
    return res.status(404).json({ message: "Scenario ne postoji!" });

  const line = scenario.content.find(l => l.lineId === lineId);
  if (!line)
    return res.status(404).json({ message: "Linija ne postoji!" });

  const existingLock = lineLocks.find(
    l => l.scenarioId === scenarioId && l.lineId === lineId
  );

  if (existingLock && existingLock.userId !== userId)
    return res.status(409).json({ message: "Linija je vec zakljucana!" });

  lineLocks = lineLocks.filter(l => l.userId !== userId);
  lineLocks.push({ userId, scenarioId, lineId });

  res.json({ message: "Linija je uspjesno zakljucana!" });
});

app.put("/api/scenarios/:scenarioId/lines/:lineId", async (req, res) => {
  const scenarioId = Number(req.params.scenarioId);
  const lineId = Number(req.params.lineId);
  const { userId, newText } = req.body;

  if (!Array.isArray(newText) || newText.length === 0)
    return res.status(400).json({ message: "Niz new_text ne smije biti prazan!" });

  const scenario = await readScenario(scenarioId);
  if (!scenario)
    return res.status(404).json({ message: "Scenario ne postoji!" });

  const lockIndex = lineLocks.findIndex(
    l => l.userId === userId && l.scenarioId === scenarioId && l.lineId === lineId
  );
  if (lockIndex === -1)
    return res.status(409).json({ message: "Linija nije zakljucana!" });

  const idx = scenario.content.findIndex(l => l.lineId === lineId);
  if (idx === -1)
    return res.status(404).json({ message: "Linija ne postoji!" });

  const oldNext = scenario.content[idx].nextLineId;

  
  let wrapped = [];
  newText.forEach(t => {
    const words = t.split(/\s+/).filter(Boolean);
    for (let i = 0; i < words.length; i += 20) {
      wrapped.push(words.slice(i, i + 20).join(" "));
    }
  });

  let maxId = Math.max(...scenario.content.map(l => l.lineId), 0);
  const newLines = wrapped.map((text, i) => ({
    lineId: i === 0 ? lineId : ++maxId,
    text,
    nextLineId: null
  }));

  for (let i = 0; i < newLines.length - 1; i++) {
    newLines[i].nextLineId = newLines[i + 1].lineId;
  }
  newLines[newLines.length - 1].nextLineId = oldNext;

  scenario.content.splice(idx, 1, ...newLines);

  const deltas = JSON.parse(await fs.readFile(DELTAS_FILE, "utf-8"));
  newLines.forEach(l => {
    deltas.push({
      scenarioId,
      type: "line_update",
      lineId: l.lineId,
      nextLineId: l.nextLineId,
      content: l.text,
      timestamp: now()
    });
  });

  await fs.writeFile(DELTAS_FILE, JSON.stringify(deltas, null, 2));
  await writeScenario(scenarioId, scenario);

  lineLocks.splice(lockIndex, 1);
  res.json({ message: "Linija je uspjesno azurirana!" });
});


app.get("/api/scenarios/:scenarioId", async (req, res) => {
  const scenario = await readScenario(Number(req.params.scenarioId));
  if (!scenario)
    return res.status(404).json({ message: "Scenario ne postoji!" });
  res.json(scenario);
});


app.post("/api/scenarios/:scenarioId/characters/lock", async (req, res) => {
  const scenarioId = Number(req.params.scenarioId);
  const { userId, characterName } = req.body;

  const scenario = await readScenario(scenarioId);
  if (!scenario)
    return res.status(404).json({ message: "Scenario ne postoji!" });

  const existing = charLocks.find(
    c => c.scenarioId === scenarioId && c.characterName === characterName
  );
  if (existing)
    return res.status(409).json({ message: "Ime lika je vec zakljucano!" });

  charLocks.push({ userId, scenarioId, characterName });
  res.json({ message: "Ime lika je uspjesno zakljucano!" });
});

app.post("/api/scenarios/:scenarioId/characters/update", async (req, res) => {
  const scenarioId = Number(req.params.scenarioId);
  const { userId, oldName, newName } = req.body;

  const scenario = await readScenario(scenarioId);
  if (!scenario)
    return res.status(404).json({ message: "Scenario ne postoji!" });

  const lockIndex = charLocks.findIndex(
    c =>
      c.userId === userId &&
      c.scenarioId === scenarioId &&
      c.characterName === oldName
  );
  if (lockIndex === -1)
    return res.status(409).json({ message: "Ime lika nije zakljucano!" });

  scenario.content.forEach(l => {
    l.text = l.text.split(oldName).join(newName);
  });

  const deltas = JSON.parse(await fs.readFile(DELTAS_FILE, "utf-8"));
  deltas.push({
    scenarioId,
    type: "char_rename",
    oldName,
    newName,
    timestamp: now()
  });

  await fs.writeFile(DELTAS_FILE, JSON.stringify(deltas, null, 2));
  await writeScenario(scenarioId, scenario);

  charLocks.splice(lockIndex, 1);
  res.json({ message: "Ime lika je uspjesno promijenjeno!" });
});


app.get("/api/scenarios/:scenarioId/deltas", async (req, res) => {
  const scenarioId = Number(req.params.scenarioId);
  const since = Number(req.query.since) || 0;

  const scenario = await readScenario(scenarioId);
  if (!scenario)
    return res.status(404).json({ message: "Scenario ne postoji!" });

  const deltas = JSON.parse(await fs.readFile(DELTAS_FILE, "utf-8"));
  res.json({
    deltas: deltas
      .filter(d => d.scenarioId === scenarioId && d.timestamp > since)
      .sort((a, b) => a.timestamp - b.timestamp)
  });
});


initStorage().then(() => {
  app.listen(PORT, () =>
    console.log(`Server running on http://localhost:${PORT}`)
  );
});
