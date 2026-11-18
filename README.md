# Links para fisioterapeutas

Site estático em Next.js, com página de links e Tabata opcional. A identidade ativa é a de Débora Eduarda, configurada em [`site.config.json`](site.config.json).

```sh
corepack enable
yarn install --immutable
yarn dev
```

Com a configuração atual, abrir `http://localhost:3000/links/`. O caminho vem de `site.basePath`, inclusive em desenvolvimento.

## Validar e gerar

```sh
yarn check:config
yarn test
yarn typecheck
yarn build
yarn check:site-export
yarn start
```

`yarn start` serve a exportação de `out/`. Para conferir instalação e funcionamento offline do Tabata, usar essa versão de produção.

O workflow existente publica no GitHub Pages ao receber um push em `main`, após testes, checagem de tipos, build e validação da exportação.

Consultar [configuração white label](docs/white-label.md) para personalizar perfil, imagens, cores, links, SEO e recursos. Os dados dos treinos permanecem no navegador.
