# CadLin Links

Microsite de links da **Cadernos de Linguística** com conteúdo editorial automático e administração mínima do destaque.

## Manutenção cotidiana

O bolsista não cadastra artigos nem edita código.

### Automático

- artigos recentes: OAI-PMH oficial da revista;
- título, autores, DOI, URL e data quando fornecidos pelos metadados;
- variante PT/EN do título quando o OAI a disponibiliza via `xml:lang`;
- notícias/chamadas: página pública de anúncios do OJS, tentando as interfaces PT e EN.

### Manual em `/admin`

Somente:

1. texto do destaque;
2. link `https://`;
3. data de expiração opcional;
4. senha de edição.

## Proteções operacionais

- nenhum commit diário se o conteúdo não mudou;
- último conjunto válido permanece no ar durante falhas transitórias;
- falha é marcada nas Actions quando os dados preservados já excedem 7 dias;
- ausência da API de destaque resulta em **nenhum destaque**, nunca em ressuscitar conteúdo antigo;
- URLs automáticas são aceitas na interface pública somente se forem `https://`;
- tentativas administrativas incorretas repetidas recebem limitação temporária;
- build do Cloudflare publica somente os arquivos necessários ao site.

Consulte `DEPLOY.md` para a configuração inicial.

<!-- Trigger de novo deployment de produção após configuração do KV. -->
