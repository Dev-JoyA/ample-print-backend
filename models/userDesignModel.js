import { DataTypes } from "sequelize";
import sequelize from "../config/postgresDb.js";

const User_Design = sequelize.define("User_Design",
    {
        user_design_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            unique: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
            references: {
                model: "USER",
                key: "user_id"
            }
        },
        design_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
            references: {
                model: "DESIGN",
                key: "design_id"
            }
        }
    },
    {
        tableName: "USER_DESIGN",
        // createdAt: 'created_at',
        timestamps: true
    }
);




export default User_Design;