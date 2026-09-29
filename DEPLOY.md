# Implantação única

Depois desta configuração, o bolsista usa apenas `/admin` para o destaque. Artigos e notícias vêm automaticamente do OJS.

## 1. Repositório

Crie um repositório GitHub para este pacote e envie todos os arquivos.

## 2. Cloudflare Pages

1. No Cloudflare Dashboard, crie um projeto **Pages** conectado ao repositório.
2. Framework preset: **None**.
3. Build command: `python scripts/build_public.py`
4. Build output directory: `public`
5. Faça o primeiro deploy.

Assim somente os arquivos públicos são publicados; `scripts/`, `.github/`, `README.md` e `DEPLOY.md` ficam fora do site.

## 3. Armazenamento do destaque

Crie um namespace **Workers KV** (por exemplo, `cadlin-links-config`).

No projeto Pages, em **Settings → Functions → KV namespace bindings**, adicione:

- Variable name: `CADLIN_CONFIG`
- KV namespace: o namespace criado acima.

## 4. Senha de edição

Em **Settings → Environment variables**, adicione como **Secret**:

- Name: `ADMIN_PASSWORD`
- Value: uma senha forte compartilhada apenas com a equipe autorizada.

A função limita tentativas incorretas repetidas por origem. Para proteção institucional adicional, pode-se colocar `/admin/` atrás do Cloudflare Access, mantendo a senha como segunda camada.

## 5. Novo deploy e teste

Faça um novo deploy e teste:

- página pública: `/`
- administração: `/admin/`

Alterações do destaque via KV normalmente propagam rapidamente, mas a interface informa que pode haver até cerca de 1 minuto de atraso.

## 6. Domínio

Associe, se desejado, um subdomínio como `links.cadernos.abralin.org`.

## 7. Automação do OJS

O workflow `.github/workflows/update-content.yml` roda diariamente e também pode ser acionado manualmente.

- Se artigos/notícias não mudarem, nenhum commit é criado.
- Se uma fonte falhar, o último JSON válido é preservado.
- Se a fonte falhar quando o último conteúdo válido já estiver com mais de 7 dias, o workflow termina em erro, tornando a falha visível nas Actions e nas notificações configuradas do repositório.
- Quando uma fonte atualiza e outra está stale/falha, a atualização válida ainda é commitada antes de o job ser marcado como erro.

Em repositórios de organização, confirme em **Settings → Actions → General** que workflows podem escrever em `contents`.

## 8. Primeira coleta real

Execute manualmente **Atualizar artigos e notícias** logo após publicar o repositório. Essa primeira execução valida a resposta OAI-PMH e a marcação dos anúncios na instalação real do OJS. O coletor foi escrito para OAI_DC, títulos com `xml:lang`, DOI em `dc:identifier` e anúncios do OJS 3.x, mantendo o último JSON válido se a origem estiver temporariamente indisponível.
