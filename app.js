import express from "express";
import cors from "cors";
import pkg from "pg";
const { Pool } = pkg;

const app = express();
app.use(cors());                // (opcional) habilita CORS para el front
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // necesario en Render Free
});

app.get("/", (_req, res) => res.json({ message: "API funcionando correctamente 🚀" }));

// Crea tabla si no existe
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
    res.status(500).json({ error: e.message });
  }
});

// Inserta una nota: /add?text=hola
app.get("/add", async (req, res) => {
  try {
    const text = req.query.text ?? "Hola desde Render DB";
    const { rows } = await pool.query(
      "INSERT INTO notes(text) VALUES($1) RETURNING *", [text]
    );
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Lista las últimas 20
app.get("/notes", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, text, created_at FROM notes ORDER BY id DESC LIMIT 20"
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API on :${PORT}`));
