import express from "express";
import cors from "cors";
import pkg from "pg";
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

// Usa INTERNAL_DATABASE_URL si la tienes; si no, DATABASE_URL
const conn = process.env.INTERNAL_DATABASE_URL || process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: conn,
  ssl: { rejectUnauthorized: false } // Render Free requiere SSL
});

app.get("/", (_req, res) => res.json({ message: "API funcionando correctamente 🚀" }));

// Diagnóstico 1: ¿tenemos env var?
app.get("/env", (_req, res) => {
  res.json({
    has_DATABASE_URL: Boolean(process.env.DATABASE_URL),
    has_INTERNAL_DATABASE_URL: Boolean(process.env.INTERNAL_DATABASE_URL)
  });
});

// Diagnóstico 2: ¿conecta a Postgres?
app.get("/health/db", async (_req, res) => {
  try {
    const r = await pool.query("SELECT now()");
    res.json({ ok: true, now: r.rows[0].now });
  } catch (e) {
    console.error("HEALTH DB:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Crea tabla
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

// Inserta
app.get("/add", async (req, res) => {
  try {
    const text = req.query.text ?? "Hola desde Render DB";
    const { rows } = await pool.query(
      "INSERT INTO notes(text) VALUES($1) RETURNING *",
      [text]
    );
    res.json(rows[0]);
  } catch (e) {
    console.error("ADD ERROR:", e);
    res.status(500).json({ error: e.message });
  }
});

// Lista
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API on :${PORT}`));
