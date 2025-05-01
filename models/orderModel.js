import { DataTypes, Transaction } from "sequelize";
import sequelize from "../config/postgresDb.js";
import User from "./userModel.js";
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
                model: "User",
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
        tableName: "ORDERS",
        timestamps: true,
        createdAt: 'created_at'
    }
);

Order.hasMany(Order_Product, {
    foreignKey: 'order_id', 
    onDelete: 'CASCADE', 
    onUpdate: 'CASCADE'
});

Order.belongsTo(User, {
    foreignKey: 'user_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});

Order.hasOne(Invoice, {
    foreignKey: 'order_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});
Order.hasOne(Transaction, {
    foreignKey: 'order_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});
Order.hasOne(Shipping, {
    foreignKey: 'order_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});


export default Order;