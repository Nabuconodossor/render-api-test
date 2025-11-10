// app.js (fragmento)
import cors from "cors";
const allowed = ["https://gabrieldev-static.onrender.com"]; // agrega tu dominio .cl cuando lo conectes
app.use(cors({ origin: allowed, methods: ["GET","POST"] }));

app.post("/notes", async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text || !text.trim()) return res.status(400).json({ error: "text requerido" });
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
