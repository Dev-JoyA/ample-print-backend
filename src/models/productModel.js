import {DataTypes} from "sequelize";
import sequelize from "../config/db.js";

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
            references : {
                model : "COLLECTION",
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
        }
    },
    {
        tableName : "PRODUCT",
        timestamps : true
    }
)


export default Product;