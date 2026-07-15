import express from "express";
import cors from "cors";

import routes from "./routes.js";
import errorMiddleware from "./middlewares/error.middleware.js";
import actuatorRoutes from "./utils/actuator.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/v1", routes);
app.use("/actuator", actuatorRoutes);

app.get("/", (req, res) => {
  res.json({ status: "All EndPoint are Up 🎯" });
});

app.use(errorMiddleware);

export default app;
