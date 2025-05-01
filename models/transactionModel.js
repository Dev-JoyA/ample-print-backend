import { DataTypes } from "sequelize";
import sequelize from "../config/postgresDb.js";

const transaction = sequelize.define("Transaction",
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
                model: "Order",
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

transaction.belongsTo(Order, {
    foreignKey: 'order_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});

sequelize.sync({ alter: true }) // Set 'force: true' to recreate tables (will delete existing data!)
    .then(() => {
        console.log('Database synchronized successfully.');
    })
    .catch((error) => {
        console.error('Error synchronizing database:', error);
    });
export default transaction_model;