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
                model: "Order",
                key: "order_id"
            }
        },
        product_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
            references: {
                model: "Product",
                key: "product_id"
            }
        },
        design_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            unique: true,
            references: {
                model: "Design",
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
        tableName: "ORDERS_PRODUCT",
        timestamps: true,
        createdAt: 'created_at'
    }
);

Order_Product.belongsTo(Order, {
    foreignKey: 'order_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});
Order_Product.belongsTo(Product, {
    foreignKey: 'product_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});
Order_Product.belongsTo(Design, {
    foreignKey: 'design_id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
});


export default Order_Product;