import { DataTypes } from "sequelize";
import User from "./userModel.js";
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
                model: "User",
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

Cart.belongsTo(User, { foreignKey: 'user_id' });
Cart.hasMany(Cart_Product, {
    foreignKey: 'cart_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});

export default Cart;