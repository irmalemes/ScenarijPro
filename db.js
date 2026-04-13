const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  "wt26",     // naziv baze
  "root",     // user
  "password", // password
  {
    host: "mysql-db",
    dialect: "mysql",
    logging: false
  }
);

module.exports = sequelize;
