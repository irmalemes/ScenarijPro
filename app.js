const { Op } = require("sequelize");
const express = require("express");
const path = require("path");

const sequelize = require("./db");
const Scenario = require("./Scenario");
const Line = require("./Line");
const Delta = require("./Delta");
const Checkpoint = require("./Checkpoint");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "writing.html"));
});


let lineLocks = [];
let charLocks = [];

const now = () => Math.floor(Date.now() / 1000);


async function seed() {
  const count = await Scenario.count();
  if (count > 0) return;

  const scenario = await Scenario.create({
    id: 1,
    title: "Potraga za izgubljenim ključem"
  });

  const lines = [
    "NARATOR: Sunce je polako zalazilo nad starim gradom.",
    "ALICE: Jesi li siguran da je ključ ostao u biblioteci?",
    "BOB: To je posljednje mjesto gdje sam ga vidio prije nego što je pala noć.",
    "ALICE: Moramo požuriti prije nego što čuvar zaključa glavna vrata.",
    "BOB: Čekaj, čuješ li taj zvuk iza polica?",
    "NARATOR: Iz sjene se polako pojavila nepoznata figura."
  ];

  for (let i = 0; i < lines.length; i++) {
    await Line.create({
      lineId: i + 1,
      text: lines[i],
      nextLineId: i === lines.length - 1 ? null : i + 2,
      scenarioId: scenario.id
    });

    await Delta.create({
      scenarioId: scenario.id,
      type: "line_update",
      lineId: i + 1,
      nextLineId: i === lines.length - 1 ? null : i + 2,
      content: lines[i],
      timestamp: 1736520000 + i * 10
    });
  }

  await Delta.create({
    scenarioId: 1,
    type: "char_rename",
    oldName: "BOB",
    newName: "ROBERT",
    timestamp: 1736520100
  });
}



app.post("/api/scenarios", async (req, res) => {
  const title = req.body?.title || "Neimenovani scenarij";

  const scenario = await Scenario.create({ title });

  await Line.create({
    lineId: 1,
    text: "",
    nextLineId: null,
    scenarioId: scenario.id
  });

  res.json({
    id: scenario.id,
    title: scenario.title,
    content: [{ lineId: 1, nextLineId: null, text: "" }]
  });
});

app.post("/api/scenarios/:scenarioId/lines/:lineId/lock", async (req, res) => {
  const { scenarioId, lineId } = req.params;
  const { userId } = req.body;

  const line = await Line.findOne({ where: { scenarioId, lineId } });
  if (!line) return res.status(404).json({ message: "Linija ne postoji!" });

  const existing = lineLocks.find(l => l.scenarioId == scenarioId && l.lineId == lineId);
  if (existing && existing.userId !== userId)
    return res.status(409).json({ message: "Linija je vec zakljucana!" });

  lineLocks = lineLocks.filter(l => l.userId !== userId);
  lineLocks.push({ userId, scenarioId, lineId });

  res.json({ message: "Linija je uspjesno zakljucana!" });
});

app.put("/api/scenarios/:scenarioId/lines/:lineId", async (req, res) => {
  const { scenarioId, lineId } = req.params;
  const { userId, newText } = req.body;

  if (!Array.isArray(newText) || newText.length === 0)
    return res.status(400).json({ message: "Niz new_text ne smije biti prazan!" });

  const anyLock = lineLocks.find(
  l => l.scenarioId == scenarioId && l.lineId == lineId
);

if (!anyLock) {
  return res.status(409).json({ message: "Linija nije zakljucana!" });
}

if (anyLock.userId !== userId) {
  return res.status(409).json({ message: "Linija je vec zakljucana!" });
}


const lockIndex = lineLocks.findIndex(
  l => l.userId === userId && l.scenarioId == scenarioId && l.lineId == lineId
);

  const original = await Line.findOne({ where: { scenarioId, lineId } });
  if (!original) return res.status(404).json({ message: "Linija ne postoji!" });

  const words = newText.join(" ").split(/\s+/).filter(Boolean);
  const chunks = [];
  for (let i = 0; i < words.length; i += 20)
    chunks.push(words.slice(i, i + 20).join(" "));

  let maxId = await Line.max("lineId", { where: { scenarioId } });
  let prevNext = original.nextLineId;

  await original.destroy();

  for (let i = 0; i < chunks.length; i++) {
    const id = i === 0 ? Number(lineId) : ++maxId;
    const next = i < chunks.length - 1 ? maxId + 1 : prevNext;

    await Line.create({
      lineId: id,
      text: chunks[i],
      nextLineId: next,
      scenarioId
    });

    await Delta.create({
      scenarioId,
      type: "line_update",
      lineId: id,
      nextLineId: next,
      content: chunks[i],
      timestamp: now()
    });
  }

  lineLocks.splice(lockIndex, 1);
  res.json({ message: "Linija je uspjesno azurirana!" });
});

app.get("/api/scenarios/:scenarioId", async (req, res) => {
  const scenario = await Scenario.findByPk(req.params.scenarioId);
  if (!scenario) return res.status(404).json({ message: "Scenario ne postoji!" });

  const lines = await Line.findAll({ where: { scenarioId: scenario.id } });
  res.json({ id: scenario.id, title: scenario.title, content: lines });
});

app.post("/api/scenarios/:scenarioId/characters/lock", async (req, res) => {
  const { scenarioId } = req.params;
  const { userId, characterName } = req.body;

  if (charLocks.find(c => c.scenarioId == scenarioId && c.characterName === characterName))
    return res.status(409).json({ message: "Ime lika je vec zakljucano!" });

  charLocks.push({ userId, scenarioId, characterName });
  res.json({ message: "Ime lika je uspjesno zakljucano!" });
});

app.post("/api/scenarios/:scenarioId/characters/update", async (req, res) => {
  const { scenarioId } = req.params;
  const { userId, oldName, newName } = req.body;

  const idx = charLocks.findIndex(
    c => c.userId === userId && c.scenarioId == scenarioId && c.characterName === oldName
  );
  if (idx === -1)
    return res.status(409).json({ message: "Ime lika nije zakljucano!" });

  const lines = await Line.findAll({ where: { scenarioId } });
  for (const l of lines) {
    l.text = l.text.split(oldName).join(newName);
    await l.save();
  }

  await Delta.create({
    scenarioId,
    type: "char_rename",
    oldName,
    newName,
    timestamp: now()
  });

  charLocks.splice(idx, 1);
  res.json({ message: "Ime lika je uspjesno promijenjeno!" });
});

app.get("/api/scenarios/:scenarioId/deltas", async (req, res) => {
  const { scenarioId } = req.params;
  const since = Number(req.query.since) || 0;

  const deltas = await Delta.findAll({
    where: { scenarioId, timestamp: { [Op.gt]: since } },
    order: [["timestamp", "ASC"]]
  });

  res.json({ deltas });
});



app.post("/api/scenarios/:scenarioId/checkpoint", async (req, res) => {
  await Checkpoint.create({
    scenarioId: req.params.scenarioId,
    timestamp: now()
  });
  res.json({ message: "Checkpoint je uspjesno kreiran!" });
});

app.get("/api/scenarios/:scenarioId/checkpoints", async (req, res) => {
  const cps = await Checkpoint.findAll({
    where: { scenarioId: req.params.scenarioId }
  });
  res.json(cps);
});

app.get("/api/scenarios/:scenarioId/restore/:checkpointId", async (req, res) => {
  const scenarioId = Number(req.params.scenarioId);
  const checkpointId = Number(req.params.checkpointId);

  
  const scenario = await Scenario.findByPk(scenarioId);
  if (!scenario) {
    return res.status(404).json({ message: "Scenario ne postoji!" });
  }


  const checkpoint = await Checkpoint.findOne({
    where: { id: checkpointId, scenarioId }
  });

  if (!checkpoint) {
    return res.status(404).json({ message: "Checkpoint ne postoji!" });
  }

  const checkpointTimestamp = checkpoint.timestamp;

  const lines = await Line.findAll({
    where: { scenarioId },
    order: [["lineId", "ASC"]]
  });

  
  let content = lines.map(l => ({
    lineId: l.lineId,
    text: l.text,
    nextLineId: l.nextLineId
  }));


  const deltas = await Delta.findAll({
    where: {
      scenarioId,
      timestamp: { [Op.lte]: checkpointTimestamp }
    },
    order: [["timestamp", "ASC"]]
  });


  deltas.forEach(delta => {
    if (delta.type === "line_update") {
      const idx = content.findIndex(l => l.lineId === delta.lineId);
      if (idx !== -1) {
        content[idx].text = delta.content;
        content[idx].nextLineId = delta.nextLineId;
      }
    }

    if (delta.type === "char_rename") {
      content.forEach(l => {
        l.text = l.text.split(delta.oldName).join(delta.newName);
      });
    }
  });

  res.json({
    id: scenario.id,
    title: scenario.title,
    content
  });
});



sequelize.sync({ force: true }).then(async () => {
  await seed();
  app.listen(PORT, () =>
    console.log(`Server running on http://localhost:${PORT}`)
  );
});
