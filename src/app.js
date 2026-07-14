import express from "express";
import cors from "cors";

import routes from "./routes.js";
import errorMiddleware from "./middlewares/error.middleware.js";
import { buildActuatorMappings } from "./utils/actuator.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/v1", routes);

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
  });
});

app.get("/", (req, res) => {
  res.json({ status: "All EndPoint are Up 🎯" });
});

app.get("/actuator/mappings", (req, res) => {
  res.json(buildActuatorMappings());
});

app.use(errorMiddleware);

export default app;
