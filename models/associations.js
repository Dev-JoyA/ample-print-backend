import { User } from "./userModel.js";
import { Profile } from "./profileModel.js";
import Invoice from "./invoiceModel.js";
import Transaction from "./transactionModel.js";
import Collection from "./collectionModel.js";
import Cart_Product from "./cartProductModel.js";
import Cart from "./cartModel.js";
import Product from "./productModel.js";
import Order from "./orderModel.js";
import Order_Product from "./orderProduct.js";
import Design from "./designModel.js";
import User_Design from "./userDesignModel.js";
import Shipping from "./shippingModel.js";
import PasswordResetToken from "./passwordResetToken.js";
import Orders from "./orderModel.js";

export const setupAssociations = () => {
    Profile.belongsTo(User, { foreignKey: "user_id" });
    Invoice.belongsTo(Order, {
        foreignKey: 'order_id',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });

    Transaction.belongsTo(Order, {
        foreignKey: 'order_id',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    Collection.hasMany(Product, {
        foreignKey: 'collection_id', 
        onDelete: 'CASCADE',   
    });
    Cart_Product.belongsTo(Product, {
        foreignKey: 'product_id', 
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
   });
    Cart_Product.belongsTo(Cart, { 
    foreignKey: 'cart_id', 
    onDelete: 'CASCADE', 
    onUpdate: 'CASCADE' 
    });

    Cart.belongsTo(User, { foreignKey: 'user_id' });
    Cart.hasMany(Cart_Product, {
        foreignKey: 'cart_id',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    Product.belongsTo(Collection, { foreignKey: 'collection_id' });
    Product.hasMany(Order_Product, {
        foreignKey: 'product_id', 
        onDelete: 'CASCADE', 
        onUpdate: 'CASCADE'
    });
    Product.hasOne(Cart, {
        foreignKey: 'product_id', 
        onDelete: 'CASCADE', 
        onUpdate: 'CASCADE'
    });
     Design.hasMany(User_Design, {
        foreignKey: "design_id",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });
      
      Design.hasMany(Order_Product, {
        foreignKey: "design_id",
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      });
      User_Design.belongsTo(Design, { foreignKey: 'design_id' });
      User_Design.belongsTo(User, { foreignKey: 'user_id' });
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
    Shipping.belongsTo(Order, {
        foreignKey: 'order_id',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    PasswordResetToken.belongsTo(User, { foreignKey: "user_id" });
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
    User.hasOne(Profile, {
        foreignKey: 'user_id', 
        onDelete: 'CASCADE',   
      });
     
      User.hasMany(User_Design, {
        foreignKey: 'user_id', 
        onDelete: 'CASCADE',   
      });
      User.hasMany(Orders, {
        foreignKey: 'user_id', 
        onDelete: 'CASCADE',   
      });
      User.hasOne(Cart, {
        foreignKey: 'user_id', 
        onDelete: 'CASCADE',   
      });
  // Add other associations here, e.g., User.hasOne(Profile, { foreignKey: "user_id" });
};