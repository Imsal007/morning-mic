// Founder Rehearsal application alerts.
// The database pings this worker with an application id. The worker claims that
// application's details from the database (allowed once, within 15 minutes) and
// emails them to the owner. No secrets are needed: ids are random and never public.
import { EmailMessage } from "cloudflare:email";

const enc = (s) => "=?UTF-8?B?" + btoa(unescape(encodeURIComponent(s))) + "?=";
const b64 = (s) => btoa(unescape(encodeURIComponent(s))).replace(/.{76}/g, "$&\r\n");

export default {
  async fetch(request, env) {
    if (request.method !== "POST") return new Response("Founder Rehearsal alerts", { status: 200 });
    let id;
    try { id = (await request.json()).id; } catch { return new Response("bad request", { status: 400 }); }
    if (!/^[0-9a-f-]{36}$/i.test(id || "")) return new Response("bad request", { status: 400 });

    const r = await fetch(env.SUPABASE_URL + "/rest/v1/rpc/claim_application_alert", {
      method: "POST",
      headers: { apikey: env.SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ p_id: id }),
    });
    const a = r.ok ? await r.json() : null;
    if (!a) return new Response("nothing to send", { status: 200 });
    if (!env.ALERT_TO) return new Response("ALERT_TO not set", { status: 500 });

    const row = (k, v) => (v && String(v).trim() ? `${k}: ${v}\n` : "");
    const text =
      `New application on founderrehearsal.com\n\n` +
      row("Name", a.name) + row("Email", a.email) + row("Company", a.company) + row("Role", a.role) +
      row("Wants to work on", (a.tracks || []).join(", ")) +
      `\nWhere they get stuck:\n${a.goal || "-"}\n\n` +
      (a.subject ? `What they speak about:\n${a.subject}\n\n` : "") +
      row("Comfort today", a.comfort) + row("English", a.english) + row("Time per day", a.minutes) +
      row("Working towards", a.deadline) +
      `\nReceived: ${new Date(a.created_at).toUTCString()}\n` +
      `Reply to this email to answer them directly.\n`;

    const raw = [
      `From: ${enc("Founder Rehearsal")} <${env.FROM}>`,
      `To: <${env.ALERT_TO}>`,
      a.email ? `Reply-To: <${a.email}>` : "",
      `Subject: ${enc("New application: " + (a.name || "someone"))}`,
      `Message-ID: <${crypto.randomUUID()}@founderrehearsal.com>`,
      `Date: ${new Date().toUTCString()}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      b64(text),
    ].filter((l, i) => l !== "" || i > 8).join("\r\n");

    await env.MAIL.send(new EmailMessage(env.FROM, env.ALERT_TO, raw));
    return new Response("sent", { status: 200 });
  },
};
