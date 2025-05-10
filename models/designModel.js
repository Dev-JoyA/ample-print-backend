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
      allowNull: true, // Optional, for logo uploads
    },
    voice_note_url: {
      type: DataTypes.STRING(255),
      allowNull: true, // Optional, for voice notes
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true, // Optional, for customization details
    },
    other_image: {
      type: DataTypes.STRING(255),
      allowNull: true, // Optional, for one additional image
    },
  },
  {
    tableName: "DESIGN",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false, // Schema doesn’t include updated_at
  }
);



export default Design;