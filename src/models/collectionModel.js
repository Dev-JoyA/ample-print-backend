import {DataTypes} from "sequelize";
import sequelize from "../config/postgresDb.js";
import Product from "./productModel.js";

const Collection = sequelize.define("Collection",
    {
        collection_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            unique : true
        },
        collection_name : {
            type: DataTypes.STRING,
            allowNull : false
        }
    },
    {
        tableName : "COLLECTION",
        timestamps : true
    }
)



export default Collection;