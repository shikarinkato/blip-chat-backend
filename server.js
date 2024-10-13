import { connect } from "mongoose";
import { httpServer } from "./index.js";
import { connectToDatabase } from "./db/db.js";

connectToDatabase();
httpServer.listen(3000, () => {
  console.log(`Server is runnig at Port: http://localhost:${3000}`);
});
