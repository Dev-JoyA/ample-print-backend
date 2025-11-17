import { DataTypes } from "sequelize";
import sequelize from "../config/postgresDb.js";

const Transaction = sequelize.define("Transaction",
    {
        transaction_id: {
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
        transaction_amount: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        transaction_status: {
           type: DataTypes.ENUM("payment", "refund"),
            allowNull: false,
        },
        payment_method: {
            type: DataTypes.ENUM("paystack", "bank_transfer"),
            allowNull: false
        }
    },
    {
        tableName: "TRANSACTION",
        createdAt: 'CURRENT_TIMESTAMP',
        timestamps: true
    }
);



export default Transaction;