import { DataTypes } from "sequelize";
import Order from "./orderModel.js";
import sequelize from "../config/postgresDb.js";

const Invoice = sequelize.define("Invoice",
    {
        invoice_id: {
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
                model: "Order",
                key: "order_id"
            }
        },
        payment_status: {
            type: DataTypes.ENUM("pending", "completed", "failed"),
            defaultValue: "pending"
        },
        amount : {
            type : DataTypes.INTEGER,
            allowNull : false
        }
    },
    {
        tableName: "INVOICE",
        timestamps: true,
        created_at: 'current_timestamp'

    }
);

Invoice.belongsTo(Order, {
    foreignKey: 'order_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});


export default Invoice;