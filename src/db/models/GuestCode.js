const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const GuestCode = sequelize.define('GuestCode', {
  code: {
    type: DataTypes.STRING(4),
    primaryKey: true,
    allowNull: false,
    validate: {
      isAlphanumeric: true,
      len: [4, 4],
    },
  },
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  max_companions: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
    },
  },
  confirmed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  attending: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: null,
  },
  expiration_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'guest_codes',
  timestamps: true,
});

module.exports = GuestCode;
