const { DataTypes } = require('sequelize');
const sequelize = require('../database');
const GuestCode = require('./GuestCode');

const Confirmation = sequelize.define('Confirmation', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING(4),
    allowNull: false,
    references: {
      model: GuestCode,
      key: 'code',
    },
  },
  full_name: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  is_child: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  age: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    validate: {
      min: 0,
      max: 17,
    },
  },
}, {
  tableName: 'confirmations',
  timestamps: true,
  validate: {
    ageRequiredForChildren() {
      if (this.is_child && (this.age === null || this.age === undefined)) {
        throw new Error('Age is required for children.');
      }
      if (!this.is_child && this.age !== null) {
        throw new Error('Age should only be provided for children.');
      }
    },
  },
});

GuestCode.hasMany(Confirmation, { foreignKey: 'code', as: 'guests' });
Confirmation.belongsTo(GuestCode, { foreignKey: 'code', as: 'guestCode' });

module.exports = Confirmation;
