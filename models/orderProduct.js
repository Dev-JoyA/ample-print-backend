import { DataTypes } from "sequelize";
import sequelize from "../config/postgresDb.js";
import Order from "./orderModel.js";
import Product from "./productModel.js";
import Design from "./userDesignModel.js";

const Order_Product = sequelize.define("Order_Product",
    {
        order_product_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            unique: true
        },
        order_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
            references: {
                model: "ORDER",
                key: "order_id"
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
        design_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            unique: true,
            references: {
                model: "DESIGN",
                key: "design_id"
            }
        },
        quantity : {
            type : DataTypes.INTEGER,
            allowNull : false
        },
        customer_file_url : {
            type : DataTypes.STRING,
            allowNull : false
        },
        customer_voice_note : {
            type : DataTypes.STRING,
            allowNull : false
        }
    },
    {
        tableName: "ORDER_PRODUCT",
        timestamps: true,
        createdAt: 'created_at'
    }
);




export default Order_Product;