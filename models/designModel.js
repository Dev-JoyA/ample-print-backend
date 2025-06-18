import { DataTypes } from "sequelize";
import sequelize from "../config/postgresDb.js";
import User_Design from "./userDesignModel.js";
import Order_Product from "./orderProduct.js";

const Design = sequelize.define(
  "Design",
  {
    design_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    logo_url: {
      type: DataTypes.STRING(255),
      allowNull: true, 
    },
    voice_note_url: {
      type: DataTypes.STRING(255),
      allowNull: true, 
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true, 
    },
    other_image: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: "DESIGN",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);



export default Design;