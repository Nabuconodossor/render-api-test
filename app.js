import express from "express";
import cors from "cors";
import pkg from "pg";
const { Pool } = pkg;

const app = express();

// --- CORS ---
// Mientras conectas tu dominio .cl, dejamos abierto.
// Luego reemplaza "*" por tu(s) dominio(s).
app.use(cors({ origin: ["https://gabrieldev-static.onrender.com"], methods:["GET","POST"] }));
app.use(express.json());

// --- DB ---
const conn = process.env.INTERNAL_DATABASE_URL || process.env.DATABASE_URL;
if (!conn) {
  console.error("No DATABASE_URL / INTERNAL_DATABASE_URL set");
}
const pool = new Pool({
  connectionString: conn,
  ssl: { rejectUnauthorized: false }
});

// --- Rutas básicas ---
app.get("/", (_req, res) => res.json({ message: "API funcionando correctamente 🚀" }));

app.get("/env", (_req, res) => {
  res.json({
    has_DATABASE_URL: Boolean(process.env.DATABASE_URL),
    has_INTERNAL_DATABASE_URL: Boolean(process.env.INTERNAL_DATABASE_URL)
  });
});

app.get("/health/db", async (_req, res) => {
  try {
    const r = await pool.query("SELECT now()");
    res.json({ ok: true, now: r.rows[0].now });
  } catch (e) {
    console.error("HEALTH DB:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// --- Notas ---
app.get("/init", async (_req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notes(
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    res.json({ ok: true });
  } catch (e) {
    console.error("INIT ERROR:", e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/add", async (req, res) => {
  try {
    const text = req.query.text ?? "Hola desde Render DB";
    const { rows } = await pool.query(
      "INSERT INTO notes(text) VALUES($1) RETURNING id, text, created_at",
      [text]
    );
    res.json(rows[0]);
  } catch (e) {
    console.error("ADD ERROR:", e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/notes", async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text || !text.trim())
      return res.status(400).json({ error: "text requerido" });

    const { rows } = await pool.query(
      "INSERT INTO notes(text) VALUES($1) RETURNING id, text, created_at",
      [text.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error("POST /notes", e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/notes", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, text, created_at FROM notes ORDER BY id DESC LIMIT 20"
    );
    res.json(rows);
  } catch (e) {
    console.error("NOTES ERROR:", e);
    res.status(500).json({ error: e.message });
  }
});

// 404 amigable
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// --- Start ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API on :${PORT}`));
