import {DataTypes} from "sequelize"
import sequelize from "../config/postgresDb.js"
import Profile from "./profileModel.js"
import Orders from "./orderModel.js";


const User = sequelize.define("User",
    {
        user_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            unique : true
        },
        role : {
            type : DataTypes.ENUM("customer", "superadmin", "admin"),
            defaultValue : "customer",
            allowNull : false
        },
    },
    {
        tableName : "User",
        timestamps : true
    }
)

 User.hasOne(Profile, {
    foreignKey: 'user_id', 
    onDelete: 'CASCADE',   
  });
 
  User.hasMany(User_Design, {
    foreignKey: 'user_id', 
    onDelete: 'CASCADE',   
  });
  User.hasMany(Orders, {
    foreignKey: 'user_id', 
    onDelete: 'CASCADE',   
  });
  User.hasOne(Cart, {
    foreignKey: 'user_id', 
    onDelete: 'CASCADE',   
  });



  export default User;


