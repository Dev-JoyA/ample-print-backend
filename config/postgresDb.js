import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();


const sequelize = new Sequelize(
    process.env.POSTGRES_DB, 
    process.env.POSTGRES_USER,
    process.env.POSTGRES_PASSWORD,
    {
        host : process.env.POSTGRES_HOST,
        port : process.env.POSTGRES_PORT || 5432,
        dialect : "postgres",
        logging : false
       // logging :  (msg) => console.log(msg)
    }
)


sequelize.sync({ alter: true })
  .then(() => {
    console.log("Database synchronized successfully.");
  })
  .catch((error) => {
    console.error("Error synchronizing database:", error);
  });



export default sequelize;