import { DataTypes } from "sequelize";
import sequelize from "../config/postgresDb.js";
import Order from "./orderModel.js";


const Shipping = sequelize.define("Shipping",
    {
        shipping_id: {
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
        shipping_method: {
            type: DataTypes.ENUM("pickup", "delivery"),
            allowNull: false
        },
        tracking_number: {
            type: DataTypes.STRING,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM("pending", "shipped", "delivered"),
            allowNull: false,
            defaultValue: "pending"
        },
    },
    {
        tableName: "Shipping",
        timestamps: true,
        createdAt: 'CURRENT_TIMESTAMP'
    }
);

Shipping.belongsTo(Order, {
    foreignKey: 'order_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});
export default Shipping;