# Manual do microsite Cadernos de Linguística

## 1. O que é

Este microsite é a página curta de acesso rápido da **Cadernos de Linguística**. Ele foi pensado principalmente para uso em links de bio e acesso por celular.

A página reúne, em um único lugar:

- os canais oficiais da revista;
- os artigos publicados mais recentemente;
- notícias e chamadas recentes;
- um destaque editorial escolhido pela equipe;
- atalhos para submissão, site da revista e newsletter.

O endereço técnico atual é:

`https://links-499.pages.dev/`

Quando o subdomínio institucional estiver configurado, o endereço público poderá ser:

`https://links.cadernos.abralin.org/`

## 2. O que é automático

A equipe não precisa cadastrar artigos manualmente.

O site consulta diariamente o próprio OJS da Cadernos de Linguística e atualiza automaticamente:

- os **10 artigos mais recentes**;
- título;
- autores;
- DOI, quando disponível;
- data de publicação;
- link para o artigo;
- título em português/inglês quando o OAI-PMH fornece mais de uma versão;
- notícias e chamadas recentes publicadas no site da revista.

A atualização é feita por GitHub Actions. Quando o conteúdo não muda, nenhum commit desnecessário é criado.

Se o OJS estiver temporariamente indisponível, o último conteúdo válido permanece no ar. Se a falha persistir por mais de 7 dias, a automação passa a sinalizar erro.

## 3. O que o bolsista precisa fazer

A única manutenção editorial manual é o **destaque**.

O painel administrativo fica em:

`https://links-499.pages.dev/admin/`

Quando o domínio institucional estiver ativo:

`https://links.cadernos.abralin.org/admin/`

No painel, preencher:

1. **Texto do destaque em português**
2. **Text in English**
3. **Link**
4. **Expira em** — opcional
5. **Senha de edição**

Depois, clicar em **Publicar destaque**.

A página pública mostra automaticamente:

- o texto em português quando estiver em PT;
- o texto em inglês quando estiver em EN.

O mesmo link e a mesma data de expiração são usados para os dois idiomas.

## 4. Data de expiração

A data de expiração é opcional.

Use quando o destaque tiver prazo, por exemplo:

- chamada para submissões;
- evento;
- prazo editorial;
- campanha temporária.

Se a data ficar vazia, o destaque permanece até ser substituído ou removido.

## 5. Remover um destaque

No `/admin`:

1. informar a senha;
2. clicar em **Remover destaque**.

Quando não há destaque ativo, a seção simplesmente não aparece na página pública.

## 6. O que não deve ser editado pelo bolsista

O bolsista não deve alterar:

- arquivos do GitHub;
- JSON;
- HTML;
- CSS;
- scripts;
- configuração do Cloudflare;
- automações do GitHub Actions.

Artigos e notícias são automáticos. Redes sociais, logo, layout e botões institucionais são fixos.

## 7. Estrutura técnica

O sistema usa:

- **GitHub** — código, automação e histórico;
- **GitHub Actions** — atualização automática dos conteúdos do OJS;
- **Cloudflare Pages** — hospedagem pública;
- **Cloudflare Pages Functions** — API do destaque;
- **Cloudflare KV** — armazenamento do destaque;
- **OAI-PMH do OJS** — metadados dos artigos;
- **site de notícias do OJS** — notícias e chamadas.

A manutenção cotidiana não exige conhecimento dessas camadas.

## 8. Verificação rápida

Se algo parecer errado:

### Artigo novo não apareceu
Aguardar a próxima execução automática ou rodar manualmente a Action **Atualizar artigos e notícias** no GitHub.

### Notícia nova não apareceu
A mesma automação atualiza as notícias.

### Destaque não aparece
Verificar:

- se foi publicado no `/admin`;
- se a data de expiração não passou;
- se o link começa com `https://`;
- se os dois textos, PT e EN, foram preenchidos.

### Admin mostra erro
Se aparecer `kv_not_configured`, o binding `CADLIN_CONFIG` precisa ser verificado no Cloudflare.

## 9. Regra editorial recomendada para destaques

O destaque deve ser usado para informação de alta relevância institucional ou editorial, e não para substituir a seção automática de notícias.

Boas situações para destaque:

- entrada em indexadores;
- chamada prioritária;
- lançamento editorial importante;
- mudança institucional relevante;
- prazo ou evento que precise de visibilidade excepcional.

Evitar destaques muito longos. O texto deve funcionar como chamada e levar o leitor ao conteúdo completo.
