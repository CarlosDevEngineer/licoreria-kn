const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API Licoreria-KN");
});

app.use(express.urlencoded({ extended: true }));

// RUTAS
const authRoutes = require("./routers/auth.routes");
const clientesRoutes = require("./routers/clientes.routes");
const productosRoutes = require("./routers/productos.routes");
const proveedoresRoutes = require("./routers/proveedores.routes");
const ventasRoutes = require("./routers/ventas.routes");

app.use("/api/auth", authRoutes);
app.use("/api/clientes", clientesRoutes);
app.use("/api/productos", productosRoutes);
app.use("/api/proveedores", proveedoresRoutes);
app.use("/api/ventas", ventasRoutes);

module.exports = app;
