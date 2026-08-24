// Endpoint público de comentários — valida Turnstile (anti-bot) e cria comentário com status "pending" (moderação)
"use strict";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const EXPECTED_HOSTNAMES = new Set([
	"nuxt.gnosisbrasil.com",
	"gnosis-brasil.pages.dev",
	"igb-site.pages.dev",
]);

module.exports = function registerEndpoint(router, { database }) {
	router.post("/", async (req, res) => {
		const { post_id, parent, author_name, author_email, author_url, content, turnstile } = req.body || {};

		if (!post_id || !author_name || !content || !String(content).trim()) {
			return res.status(400).json({ errors: [{ message: "Campos obrigatórios: post_id, author_name, content" }] });
		}
		if (String(author_name).trim().length > 200) {
			return res.status(400).json({ errors: [{ message: "Nome muito longo" }] });
		}
		if (String(content).trim().length > 5000) {
			return res.status(400).json({ errors: [{ message: "Comentário muito longo" }] });
		}

		// Turnstile (anti-bot)
		if (typeof turnstile !== "string" || turnstile.length === 0 || turnstile.length > 2048) {
			return res.status(403).json({ errors: [{ message: "Verificação anti-bot inválida" }] });
		}

		let result;
		try {
			const r = await fetch(SITEVERIFY_URL, {
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
				signal: AbortSignal.timeout(10000),
				body: new URLSearchParams({
					secret: process.env.TURNSTILE_SECRET || "",
					response: turnstile,
				}),
			});
			if (!r.ok) {
				return res.status(403).json({ errors: [{ message: "Verificação anti-bot inválida" }] });
			}
			result = await r.json();
		} catch {
			return res.status(403).json({ errors: [{ message: "Verificação anti-bot inválida" }] });
		}

		if (!result.success || !EXPECTED_HOSTNAMES.has(result.hostname)) {
			return res.status(403).json({ errors: [{ message: "Verificação anti-bot inválida" }] });
		}

		// inserir com status "pending" (aguardando moderação)
		try {
			const inserted = await database("comentarios")
				.insert({
					wp_id: null,
					post_id,
					parent: parent ? parseInt(parent, 10) : 0,
					author_name: String(author_name).trim(),
					author_email: String(author_email || "").trim(),
					author_url: String(author_url || "").trim().slice(0, 300),
					content: String(content).trim(),
					date: new Date(),
					status: "pending",
				})
				.returning("id");
			const id = Array.isArray(inserted) ? inserted[0]?.id ?? inserted[0] : inserted;
			return res.json({ data: { id, status: "pending" } });
		} catch (e) {
			console.error("[comentarios] erro no insert:", e);
			return res.status(500).json({ errors: [{ message: "Erro ao salvar o comentário" }] });
		}
	});
};