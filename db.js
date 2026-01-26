const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  "wt26",     // naziv baze
  "root",     // user
  "password", // password
  {
    host: "localhost",
    dialect: "mysql",
    logging: false
  }
);

module.exports = sequelize;
