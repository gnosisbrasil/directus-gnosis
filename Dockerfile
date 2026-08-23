# Directus com o módulo custom "Site" (Gnosis Brasil)
FROM directus/directus:12.3.0

# Extensão do módulo Site — copiada para o diretório de extensões
COPY extensions/ /directus/extensions/
