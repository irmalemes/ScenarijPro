const Scenario = require("./Scenario");
const Line = require("./Line");
const Delta = require("./Delta");
const Checkpoint = require("./Checkpoint");

Scenario.hasMany(Line, { foreignKey: "scenarioId" });
Line.belongsTo(Scenario, { foreignKey: "scenarioId" });

Scenario.hasMany(Delta, { foreignKey: "scenarioId" });
Delta.belongsTo(Scenario, { foreignKey: "scenarioId" });

Scenario.hasMany(Checkpoint, { foreignKey: "scenarioId" });
Checkpoint.belongsTo(Scenario, { foreignKey: "scenarioId" });

module.exports = {
  Scenario,
  Line,
  Delta,
  Checkpoint
};
