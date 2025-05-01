import { DataTypes } from "sequelize";
import sequelize from "../config/postgresDb.js";

const User_Design = sequelize.define("User_Design",
    {
        user_design_id: {
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
        },
        design_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
            references: {
                model: "Design",
                key: "design_id"
            }
        }
    },
    {
        tableName: "User_Design",
        timestamps: true
    }
);

User_Design.belongsTo(Design, { foreignKey: 'design_id' });
User_Design.belongsTo(User, { foreignKey: 'user_id' });

sequelize.sync({ alter: true })
    .then(() => {
        console.log("User_Design table created successfully");
    })
    .catch((error) => {
        console.error("Error creating User_Design table:", error);
    });
export default User_Design;