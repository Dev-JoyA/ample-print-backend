import {DataTypes} from "sequelize"
import sequelize from "../config/postgresDb.js"
import {Profile} from "./profileModel.js"
import Orders from "./orderModel.js";

export const User = sequelize.define("User",
    {
        user_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        role : {
            type : DataTypes.ENUM("customer", "superadmin", "admin"),
            defaultValue : "customer",
            allowNull : false
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: false,
        }
    },
    {
        tableName : "USER",
        timestamps : true
    }
)





 


