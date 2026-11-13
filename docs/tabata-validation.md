# Tabata: implementação e validação

Implementado em 13/11/2026, após a confirmação do desenho na Q17. Publicação preparada para o workflow existente do GitHub Pages, conforme autorização do usuário.

## Abrir o aplicativo

Para desenvolver:

```sh
npm run dev
```

Abrir `http://localhost:3000/links/timer/`. A página inicial de links também tem acesso ao timer, na mesma aba.

Para testar a versão exportada, incluindo instalação e cache offline:

```sh
npm run build
npm run start
```

Abrir o mesmo endereço. O servidor de preview e o desenvolvimento usam `/links`, com os mesmos caminhos do GitHub Pages; `/links/` é a página inicial e `/links/timer/` é o aplicativo. O service worker é registrado somente na versão de produção, sob `/links/timer/`. Depois de todos os recursos serem armazenados, o rodapé indica disponibilidade offline. A atualização do worker aguarda o encerramento das sessões anteriores; cada build possui cache próprio.

## Verificações realizadas

- `npm run test:tabata`: **39 testes passaram**. Cobrem sequência, descanso final e entre séries, fases zero, nomes, passagem real do tempo, pausas, saltos, conclusão, interrupção, independência de configurações, retenção de favoritas, validação de armazenamento, geração de IDs sem `randomUUID`, preferências iniciais e deduplicação de alertas entre emissores. Incluem testes do worker, da política de áudio do iPhone e da faixa completa de bipes, além dos controles reais da interface em DOM simulado.
- `npm run typecheck`: passou.
- `npm run build`: passou, incluindo a verificação de tipos e a exportação estática das rotas. Foi removida a configuração anterior que ignorava erros de TypeScript.
- `npm run check:tabata-export`: passou. O worker foi exercitado com o HTML e os arquivos reais da exportação em um ambiente simulado, verificando **26 recursos** offline, incluindo scripts, estilos, fontes, ícones e arquivos de áudio. Também verifica manifesto, cache específico do build, acesso ao timer pela home e canonical único da rota.
- Verificação HTTP no servidor de preview: página inicial `/links/`, `/links/timer/` e acesso direto sem barra final são verificados; a antiga rota `/links/tabata/` retornou 404; os **15 recursos vinculados** pelo HTML retornaram sucesso. O manifesto, o tipo de conteúdo e a resposta HEAD do worker também passaram.
- `git diff --check`: passou.

## Limites da verificação

A conexão de automação com o navegador falhou antes de abrir a página: o plugin tentou carregar um `browser-service.mjs` de uma versão ausente do seu próprio cache. Não foi possível fazer a conferência visual ou executar os controles em um navegador real nesta sessão. A simulação do worker não substitui um teste offline com service worker real.

Ainda precisam de validação manual em iPhone e Android: aparência em retrato/paisagem, controles por toque, instalação, recarga offline, coordenação de abas, bipes e voz no alto-falante, vibração, Wake Lock e interação com música. Alertas durante suspensão ou bloqueio da tela permanecem sujeitos aos limites de plataforma aceitos no [ADR 0002](adr/0002-tabata-web-com-limites-de-segundo-plano.md).

## Organização da implementação

- `app/timer/page.tsx`: rota e metadados específicos.
- `components/tabata/`: interface, estilos responsivos e integração do estado com recursos do navegador.
- `lib/tabata/engine.ts`: sequência e operações puras do relógio.
- `lib/tabata/storage.ts`: formato versionado, validação e retenção local.
- `lib/tabata/alerts.ts`: bipes sintetizados, voz, vibração e deduplicação.
- `lib/tabata/audio-track.ts`: renderização local da sequência de bipes em WAV para o player de mídia.
- `public/timer/`: manifesto, ícones e worker offline.
- `scripts/`: preparação do worker por build, verificação da exportação e servidor de preview.
- `tests/`: verificações automatizadas do domínio, da persistência e do worker.

Os dados ficam em `localStorage`, separados em modelos, execuções, preferências e configuração em edição. A execução ativa mantém a configuração que tinha ao iniciar. Uma cópia interna de dados ilegíveis é preservada antes de novos dados sobrescreverem o registro principal; não há exportação/importação nem envio de treinos para servidor.

## Correções após a primeira entrega

- A rota mudou para `/timer/`, sem prefixo global. Manifesto, ícones, escopo do worker, links, sitemap, metadados, servidor de preview e verificações de exportação foram atualizados. As chaves do armazenamento local foram mantidas, preservando dados no mesmo navegador e origem.
- O erro `crypto.randomUUID is not a function` foi reproduzido nos dois pontos da interface que criam IDs. A geração agora verifica a disponibilidade da função, usa `getRandomValues` como alternativa e permite IDs locais mesmo sem Web Crypto. Quatro testes de regressão cobrem o caminho nativo, ausência de `randomUUID`, ausência de todas as APIs e recusa da função nativa. Esses IDs identificam registros locais e não são usados como credenciais.
- O aviso de hidratação informado contém `webcrx`, `webcrx-bridged` e `data-locator-hook-status-message`, ausentes do código do projeto. O trecho fornecido indica HTML alterado por extensões antes da hidratação, incluindo também `cz-shortcut-listen` no body. O aviso foi reproduzido com React e o layout real em JSDOM, inserindo exatamente esses atributos antes de `hydrateRoot`. Foi aplicado `suppressHydrationWarning` somente a `html`, `head` e `body`. Os atributos inseridos pelas extensões permanecem; o tratamento evita o aviso nessas três tags externas, mantendo a verificação dos componentes descendentes.

Referências: [restrição de contexto seguro do randomUUID](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID), [getRandomValues em contextos HTTP](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues) e [causas de hidratação no Next.js](https://nextjs.org/docs/messages/react-hydration-error).

## Publicação no GitHub Pages

O usuário autorizou publicar em `https://defisio.github.io/links/timer/` e pediu manter o mesmo prefixo no desenvolvimento local. O `basePath` de `/links` está definido em `next.config.mjs`, também utilizado na preparação e validação da exportação. Manifesto, ícones, canonical, sitemap, cache offline e registro do worker respeitam esse prefixo. O workflow `.github/workflows/deploy.yml` publica a branch `main` no GitHub Pages existente, validando o timer exportado antes de enviar o artefato.

## Regressão de hidratação com extensões

O teste `tests/tabata-hydration.test.mjs` reproduziu exatamente o aviso informado antes da correção. Depois da mudança, os três casos passam: hidratação normal sem extensões; hidratação com os quatro atributos externos, sem avisos; e uma divergência real em um componente descendente, que continua produzindo aviso. Um botão do componente de teste é acionado após a hidratação em cada caso, verificando que os eventos continuam funcionando.

O JSDOM foi incluído apenas como dependência de desenvolvimento. O teste usa o layout real, substituindo somente os imports de build de fonte, CSS e caminho de assets. É uma verificação de hidratação em DOM simulado, e não um teste visual em navegador físico. O alcance de `suppressHydrationWarning` em um único nível segue a [documentação do React](https://react.dev/reference/react-dom/client/hydrateRoot#suppressing-unavoidable-hydration-mismatch-errors).

## Publicar novas alterações

Executar `yarn test:tabata`, `yarn build` e `yarn check:tabata-export`; fazer commit e push para `main`; acompanhar o workflow `Deploy to GitHub Pages` e confirmar o acesso a `https://defisio.github.io/links/timer/`. O mesmo caminho funciona em `http://localhost:3000/links/timer/` com `yarn dev` ou `yarn start` após o build.

## Silencioso e segundo plano no iPhone

O usuário confirmou em teste físico que retirar o silencioso fazia o som voltar. A correção seleciona a categoria `playback` antes de criar ou retomar o AudioContext e espera a retomada assíncrona antes de emitir alertas avulsos. A sessão é liberada ao pausar/encerrar; o aplicativo informa que a reprodução pode pausar música de outros apps.

Para segundo plano, a sequência completa restante de bipes é renderizada em WAV e entregue ao player de mídia previamente desbloqueado pelo toque. Pausa, retomada, salto de fase, botão de som, controles de mídia e recuperação após recarga foram verificados com o componente e hook reais em JSDOM. O teste confirma também que ocultar a página não pausa o player e que as operações não criam execuções duplicadas. Outro teste simula a exigência de gesto por elemento, conferindo que o mesmo player desbloqueado é reutilizado depois da persistência assíncrona.

Os testes inspecionam o WAV para verificar alertas futuros e offsets de retomada/salto, sem executar temporizadores para produzir os bipes. Isso não equivale a ouvir o áudio em um iPhone físico. Após publicar, verificar no aparelho: silencioso ligado, volume de mídia audível, treino iniciado por toque, alternância de app e bloqueio da tela. Voz e vibração permanecem dependentes das capacidades e da suspensão pelo Safari. Ver [ADR 0003](adr/0003-bipes-como-faixa-de-audio.md).
