import { DataTypes } from "sequelize";
import sequelize from "../config/postgresDb.js";
import { User } from "./userModel.js";
import Invoice from "./invoiceModel.js";
import Transaction from "./transactionModel.js";
import Order_Product from "./orderProduct.js";
import Shipping from "./shippingModel.js";

const Order = sequelize.define("Order",
    {
        order_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            unique: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "USER",
                key: "user_id"
            }
        },
        payment_status: {
            type: DataTypes.ENUM("pending", "completed", "failed"),
            defaultValue: "pending"
        },
        deposit_paid: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00
        },
        total_amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        }
    },
    {
        tableName: "ORDER",
        timestamps: true,
        createdAt: 'created_at'
    }
);




export default Order;