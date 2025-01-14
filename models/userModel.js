import {DataTypes} from "sequelize";
import sequelize from "../config.js/postgresDb.js";



const User = sequelize.define("User",
    {
       id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
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
            type : DataTypes.TEXT,
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
            type : DataTypes.INTEGER,
            allowNull : false
        }
    },
    {
        tableName : "Users",
        timestamps : true
    }
)

sequelize.sync({ force: false }) // Set 'force: true' to recreate tables (will delete existing data!)
    .then(() => {
        console.log('Database synchronized successfully.');
    })
    .catch((error) => {
        console.error('Error synchronizing database:', error);
    });

export default User;