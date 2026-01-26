const { DataTypes } = require("sequelize");
const sequelize = require("./db");

const Line = sequelize.define(
  "Line",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    lineId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    nextLineId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    scenarioId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  },
  {
    freezeTableName: true,
    timestamps: false
  }
);

module.exports = Line;
