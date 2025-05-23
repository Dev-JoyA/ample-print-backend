import { DataTypes } from "sequelize";
import sequelize from "../config/postgresDb.js";
import Product from "./productModel.js";
import Cart from "./cartModel.js";

const Cart_Product = sequelize.define("Cart_Product",
    {
        cart_product_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            unique: true
        },
        cart_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
            references: {
                model: "CART",
                key: "cart_id"
            }
        },
        product_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
            references: {
                model: "PRODUCT",
                key: "product_id"
            }
        },
        quantity : {
            type : DataTypes.INTEGER,
            allowNull : false
        }
    },
    {
        tableName: "CART_PRODUCT",
        timestamps: true
    }
);


export default Cart_Product;
