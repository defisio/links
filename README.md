# Site do profissional

Este repositório guarda a configuração e os arquivos da marca. O aplicativo e seus testes ficam em [WiltonV/central-links](https://github.com/WiltonV/central-links).

- `site.config.json`: perfil, links, cores, SEO, endereço e recursos.
- `public/`: foto, logos e demais arquivos exclusivos deste profissional.
- `central.config.json`: SHA completo da versão aprovada da central.

## Desenvolvimento

Requer Node.js 20.19 ou superior, Git e Corepack/Yarn disponíveis (`corepack enable`). Não é necessário instalar dependências na raiz deste repositório.

```sh
npm run dev
```

O comando busca a revisão aprovada da central, combina com a configuração local em `.site/`, instala as dependências desse aplicativo gerado e inicia o Next.js. O endereço usa o `site.basePath` da configuração.

Para testar uma alteração ainda local da central:

```sh
npm run dev -- --source ../central-links
npm run build -- --source ../central-links
```

Esse parâmetro afeta apenas a execução local. Ele não altera a versão aprovada nem publica o site. A mesma opção funciona com `test`, `typecheck`, `check:config` e `check:site-export`.

```sh
npm test
npm run typecheck
npm run build
npm run check:site-export
npm start
```

`npm start` serve a última exportação de `.site/out/`. `.site/` e `.central-links/` são diretórios gerados e ignorados pelo Git.

## Aprovar atualizações

A rotina `Check central updates` consulta a versão estável diariamente e também pode ser iniciada por `Run workflow`. Havendo uma versão nova, ela testa a candidata com os dados deste profissional antes de propor a atualização.

**A publicação só acontece quando você aceita e faz o merge do PR na `main`.** A rotina nunca aprova ou faz merge por conta própria. Fechar um PR sem merge recusa aquela candidata; ela não será proposta novamente.

Se a política do repositório bloquear PRs criados pelo GitHub Actions, a rotina abre uma solicitação em Issues com a branch pronta e o link para criar o PR manualmente. Depois de aceitar ou recusar, feche a solicitação. Não é necessário conceder novas credenciais para esse fluxo.

O GitHub pode atrasar agendamentos e desativá-los em repositórios públicos sem atividade por 60 dias. Nesse caso, reative `Check central updates` em Actions; a execução manual também fica disponível.

Para voltar a uma versão anterior, altere `central.config.json.revision` para o SHA completo que deseja e publique essa alteração pela `main`. O workflow valida a versão antes do deploy. Não altere o `id` do profissional para manter seus treinos salvos.

Os workflows usam o controlador versionado `@v1` da central. Uma mudança futura no contrato desses workflows poderá exigir atualizar essa referência; atualizações normais do aplicativo são propostas pelo campo `revision`.
