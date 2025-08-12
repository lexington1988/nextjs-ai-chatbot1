// api/arena.js
export default async function handler(req, res) {
  // CORS for CodePen/browser
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST", "OPTIONS"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { mode, yourTeam, enemyTeam, roster, enemyTotalPower } = req.body || {};
  if (!mode) return res.status(400).json({ error: "Missing mode" });

  const sys = [
    "You are a Hero Wars Arena analyst.",
    "Be concrete, concise, and tactical.",
    "Only use the provided data. If something is unknown, say so briefly."
  ].join(" ");

  const user = JSON.stringify(
    { mode, yourTeam, enemyTeam, roster, enemyTotalPower },
    null,
    2
  );

  try {
    const rsp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: sys },
          {
            role: "user",
            content:
`MODE: ${mode}

DATA (JSON):
${user}

Task:
- If mode === "compare": estimate win probability (0-100%) and give a 3-6 line outcome analysis.
- If mode === "recommend": propose the best 5-hero lineup from "roster" versus "enemyTeam". Suggest swaps if needed (OUT → IN) with a 1-line reason each.
- Reference hero synergies and counters (Isaac vs mages, Helios vs crit, Andvari vs knock-ups, Celeste heal block, Aurora dodge tank).
- Return short Markdown.`
          }
        ]
      })
    });

    if (!rsp.ok) {
      const text = await rsp.text();
      return res.status(rsp.status).json({ error: text });
    }

    const data = await rsp.json();
    const answer = data?.choices?.[0]?.message?.content ?? "No response.";
    return res.status(200).json({ answer });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
}
