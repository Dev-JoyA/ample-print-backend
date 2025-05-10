import {DataTypes} from "sequelize";
import sequelize from "../config/postgresDb.js";
import { User } from "./userModel.js";

export const Profile = sequelize.define("Profile",
    {
       profile_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull : false,
            unique : true,
            references : {
                model : 'USER',
                key : "user_id"
            },
            onDelete : 'CASCADE',
            onUpdate : 'CASCADE'
        },
        firstName : {
            type: DataTypes.STRING,
            allowNull : false
        },
        lastName : {
            type: DataTypes.STRING,
            allowNull : false
        },
        userName : {
            type : DataTypes.STRING,
            allowNull :false,
            unique : true
        },
        email : {
            type: DataTypes.STRING,
            allowNull: false,
            unique : true, 
            validate : {
                isEmail : true
            }
        },
        password : {
            type : DataTypes.STRING,
            allowNull : false
        },
        phoneNumber : {
            type : DataTypes.STRING,
            allowNull : false
        }
    },
    {
        tableName : "PROFILE",
        timestamps : true
    }
)




