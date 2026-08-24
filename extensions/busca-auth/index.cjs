// Endpoint de autenticação da Busca Gnosis — valida credenciais contra busca_perfis
"use strict";

module.exports = function registerEndpoint(router, { database }) {
	router.post("/login", async (req, res) => {
		const { name, senha } = req.body || {};
		if (!name || !senha) {
			return res.status(400).json({ errors: [{ message: "name e senha são obrigatórios" }] });
		}
		try {
			const user = await database("busca_perfis").where({ name, senha }).first();
			if (!user) {
				return res.status(401).json({ errors: [{ message: "Credenciais inválidas" }] });
			}
			res.json({
				token: "busca-" + Buffer.from(`${name}:${senha}`).toString("base64"),
				name: user.name,
				perfil: user.name,
			});
		} catch (e) {
			res.status(500).json({ errors: [{ message: "Erro interno" }] });
		}
	});
};