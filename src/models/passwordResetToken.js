import { DataTypes } from "sequelize";
import sequelize from "../config/postgresDb.js";
import { User } from "./userModel.js"; // Adjust path

const PasswordResetToken = sequelize.define(
  "PasswordResetToken",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "USER",
        key: "user_id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: "PASSWORD_RESET_TOKEN",
    timestamps: false,
  }
);



export default PasswordResetToken;