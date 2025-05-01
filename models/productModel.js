import {DataTypes} from "sequelize";
import sequelize from "../config/postgresDb.js";
import Collection from "./collectionModel.js"
import Order_Product from "./orderProduct.js";
import Cart from "./cartModel.js";

const Product = sequelize.define("Product",
    {
       product_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            unique : true
        },
        collection_id: {
            type: DataTypes.INTEGER,
            allowNull : false,
            unique : true,
            references : {
                model : Collection,
                key : "collection_id"
            },
            onDelete : 'SET NULL',
            onUpdate : 'CASCADE'
        },
        product_name : {
            type: DataTypes.STRING,
            allowNull : false
        },
        product_description : {
            type: DataTypes.STRING,
            allowNull : false
        },
        product_price : {
            type : DataTypes.INTEGER,
            allowNull :false,
        },
        product_image : {
            type : DataTypes.STRING,
            allowNull : false
        },
        dimension : {
            type : DataTypes.STRING,
            allowNull : false
        },
        min_order : {
            type : DataTypes.INTEGER,
            allowNull : false
        },
        delivery_time : {
            type : DataTypes.STRING,
            allowNull : false
        },
     
    },
    {
        tableName : "PRODUCT",
        timestamps : true
    }
)

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

export default Product;