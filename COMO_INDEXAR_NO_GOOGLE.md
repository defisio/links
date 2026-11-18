# Como cadastrar seu site no Google Search Console

1. Acesse: https://search.google.com/search-console
2. Clique em "Adicionar propriedade" e insira a URL pública configurada em `site.origin` + `site.basePath` + `/` no arquivo `site.config.json`. Para Débora: https://defisio.github.io/links/
3. Escolha a opção de verificação por URL prefixada.
4. Selecione "Arquivo HTML" ou "Tag HTML" para verificação.
5. Como o site está no GitHub Pages, use a opção "Tag HTML":
   - Copie o valor de `content` da meta tag fornecida pelo Google.
   - Preencha `seo.googleSiteVerification` em `site.config.json` com esse valor. Não cole a tag HTML inteira.
   - Gere e publique novamente o site; a meta tag será criada automaticamente.
6. Clique em "Verificar" no Search Console.

Pronto! Agora o Google irá indexar seu site e você poderá acompanhar o desempenho.

Dica: O sitemap é gerado automaticamente com os endereços da configuração. Informe no Search Console a URL pública do site seguida de `sitemap.xml` e monitore os relatórios.
