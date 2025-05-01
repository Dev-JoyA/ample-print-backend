import { DataTypes } from "sequelize";
import sequelize from "../config/postgresDb.js";
import User_Design from "./userDesignModel.js";
import Order_Product from "./orderProduct.js";

const Design = sequelize.define("Product",
    {
        design_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            unique: true
        },
        design_voice_note: {
            type: DataTypes.STRING,
            allowNull: false
        },
        design_description: {
            type: DataTypes.STRING,
            allowNull: false
        },
        logo: {
            type: DataTypes.STRING,
            allowNull: false
        },
        other_images: {
            type: DataTypes.STRING,
            allowNull: false
        }
 },
    {
        tableName: "DESIGN",
        timestamps: true,
        createdAt: 'CURRENT_TIMESTAMP'
    }
)

Design.hasMany(User_Design, {
    foreignKey: 'design_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});

Design.hasMany(Order_Product, {
    foreignKey: 'design_id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
});


export default Design;
