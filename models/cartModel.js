import { DataTypes } from "sequelize";
import { User }from "./userModel.js";
import sequelize from "../config/postgresDb.js";
import Cart_Product from "./cartProductModel.js";

const Cart = sequelize.define("Cart",
    {
        cart_id: {
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
        }
        },
        {
        tableName: "CART",
        timestamps: true,
        createdAt: 'CURRENT_TIMESTAMP'
    }
);


export default Cart;