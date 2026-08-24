// Directus hook: converte content_blocks (EditorJS JSON) -> content (HTML)
// Mantém o campo content sempre renderizável pelo frontend (que usa HTML).
"use strict";

const FIELD = "content_blocks";
const TARGET = "content";

function esc(text) {
	return String(text == null ? "" : text);
}

function blocksToHtml(blocks) {
	if (!Array.isArray(blocks) || blocks.length === 0) return null;
	const out = [];
	for (const block of blocks) {
		const d = block && block.data ? block.data : {};
		switch (block.type) {
			case "paragraph": {
				let t = esc(d.text);
				if (t.trim()) out.push(`<p>${t.replace(/\n/g, "<br>")}</p>`);
				break;
			}
			case "header": {
				const level = Math.min(6, Math.max(1, parseInt(d.level, 10) || 2));
				if (esc(d.text).trim()) out.push(`<h${level}>${esc(d.text)}</h${level}>`);
				break;
			}
			case "list": {
				const tag = d.style === "ordered" ? "ol" : "ul";
				const items = Array.isArray(d.items) ? d.items : [];
				if (items.length) out.push(`<${tag}>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</${tag}>`);
				break;
			}
			case "image": {
				let src = esc(d.url || d.file || "");
				if (!src && d.file) src = `/assets/${esc(d.file)}`;
				if (src) {
					const cap = esc(d.caption);
					out.push(
						`<figure><img src="${src}" alt="${cap}">${cap ? `<figcaption>${cap}</figcaption>` : ""}</figure>`
					);
				}
				break;
			}
			case "quote": {
				const t = esc(d.text);
				if (t.trim()) {
					const cap = esc(d.caption);
					out.push(`<blockquote><p>${t}</p>${cap ? `<footer>${cap}</footer>` : ""}</blockquote>`);
				}
				break;
			}
			case "checklist": {
				const items = Array.isArray(d.items) ? d.items : [];
				if (items.length) {
					out.push(
						`<ul class="checklist">${items
							.map((i) => `<li>${i.checked ? "☑ " : "☐ "}${esc(i.text)}</li>`)
							.join("")}</ul>`
					);
				}
				break;
			}
			case "table": {
				const rows = Array.isArray(d.content) ? d.content : [];
				if (rows.length) {
					const trs = rows
						.map(
							(row) =>
								`<tr>${(Array.isArray(row) ? row : [])
									.map((cell) => (d.withHeadings && rows.indexOf(row) === 0 ? `<th>${esc(cell)}</th>` : `<td>${esc(cell)}</td>`))
									.join("")}</tr>`
						)
						.join("");
					out.push(`<table>${trs}</table>`);
				}
				break;
			}
			case "code": {
				if (esc(d.code)) out.push(`<pre><code>${esc(d.code)}</code></pre>`);
				break;
			}
			case "delimiter": {
				out.push("<hr>");
				break;
			}
			case "embed": {
				const src = esc(d.embed || d.url || "");
				if (src) {
					const cap = esc(d.caption);
					out.push(
						`<figure><iframe src="${src}" frameborder="0" allowfullscreen></iframe>${cap ? `<figcaption>${cap}</figcaption>` : ""}</figure>`
					);
				}
				break;
			}
			case "raw": {
				if (esc(d.html)) out.push(esc(d.html));
				break;
			}
			default:
				break;
		}
	}
	return out.length ? out.join("\n") : null;
}

module.exports = function registerHook({ filter }) {
	filter("items.create", async (payload) => transform(payload));
	filter("items.update", async (payload) => transform(payload));
	filter("items.create.any", async (payload) => transform(payload));
	filter("items.update.any", async (payload) => transform(payload));

	function transform(payload) {
		if (!payload || payload[FIELD] == null) return payload;
		try {
			const json = typeof payload[FIELD] === "string" ? JSON.parse(payload[FIELD]) : payload[FIELD];
			if (json && Array.isArray(json.blocks) && json.blocks.length) {
				const html = blocksToHtml(json.blocks);
				if (html) payload[TARGET] = html;
			}
		} catch (e) {
			// conteúdo não é JSON válido: mantém o que veio
		}
		return payload;
	}
};