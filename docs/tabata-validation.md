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

- `npm run test:tabata`: **46 testes passaram**. Cobrem sequência, descanso final e entre séries, fases zero, nomes, passagem real do tempo, pausas, saltos, conclusão, interrupção, independência de configurações, retenção de favoritas, validação de armazenamento, geração de IDs sem `randomUUID`, preferências iniciais e deduplicação de alertas entre emissores. Incluem testes do worker, da política de áudio do iPhone e da faixa completa de bipes e avisos falados, além dos controles reais da interface em DOM simulado.
- `npm run typecheck`: passou.
- `npm run build`: passou, incluindo a verificação de tipos e a exportação estática das rotas. Foi removida a configuração anterior que ignorava erros de TypeScript.
- `npm run check:tabata-export`: passou. O worker foi exercitado com o HTML e os arquivos reais da exportação em um ambiente simulado, verificando **25 recursos** offline, incluindo scripts, estilos, fontes, ícones e arquivos de áudio. Também verifica manifesto, cache específico do build, acesso ao timer pela home e canonical único da rota.
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
- `lib/tabata/audio-track.ts`: renderização local da sequência de bipes e avisos de fase em WAV para o player de mídia.
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

Os testes inspecionam o WAV para verificar alertas futuros e offsets de retomada/salto, sem executar temporizadores para produzir os bipes. Isso não equivale a ouvir o áudio em um iPhone físico. Após publicar, verificar no aparelho: silencioso ligado, volume de mídia audível, treino iniciado por toque, alternância de app e bloqueio da tela. O usuário confirmou os bipes em segundo plano. Depois de informar que as vozes não continuavam, os avisos padrão de fase passaram a integrar o mesmo WAV. Os novos testes verificam a presença dos samples reais de cada frase, voz sem bipes, alteração independente das opções, retomada sem repetir avisos antigos e ausência de SpeechSynthesis para fases padrão. Os nomes personalizados continuam via SpeechSynthesis com o app aberto; a vibração depende do aparelho. Os novos avisos ainda precisam ser ouvidos em iPhone físico. Ver [ADR 0003](adr/0003-bipes-como-faixa-de-audio.md).

## Simplificação da interface em 14/11/2026

Removidos a área de histórico, seus filtros e ações, o bloco “Sempre à mão” com atalho para o clássico e a marca no cabeçalho do timer. Meus treinos mostra diretamente os modelos salvos, com uma linha de ícones para exercício, descanso e repetições usando seus valores reais. Os controles de voltar e preferências permanecem com alvos de 44 px, em um cabeçalho menor. A navegação em paisagem foi centralizada para acomodar ambos.

A suíte existente de 44 testes e a checagem de tipos passaram. Uma verificação temporária do componente real em JSDOM confirmou as duas abas, o cabeçalho sem texto, abertura/fechamento das preferências, os ícones e valores de um modelo 35s/0s × 3, carregamento e exclusão de modelo, o estado vazio e os controles do cronômetro. A ferramenta de navegador falhou ao conectar, portanto essa rodada não inclui inspeção visual de retrato/paisagem em navegador real. A exportação de produção e seus recursos offline foram verificados antes da publicação.

## Preparação nos cards e build de publicação

A linha dos modelos agora mostra preparação, exercício, descanso e repetições, nessa ordem, usando os valores salvos. Na publicação dessa correção, o build do Turbopack falhou ao processar URLs de fonte do Google com parâmetros, com os erros `next/font/google queries have exactly one entry` e `Cannot resolve @vercel/turbopack-next/internal/font/google/font`. O script de produção passou a usar `next build --webpack`, opção suportada pela versão instalada do Next.js. O build com Webpack, a checagem TypeScript incorporada, os 44 testes e os 25 recursos da exportação offline passaram localmente. O desenvolvimento continua utilizando o comando existente.

## Áudios fornecidos pelo usuário

Os onze arquivos foram padronizados em MP3 mono, 24 kHz, 64 kbps, com cortes de pausas, ajuste de volume, verificação de amplitude e preservação dos originais. Total de 119.332 bytes nas cópias, 88,1% menor. A pedido do usuário, o relógio foi incorporado a todas as fases da faixa de mídia e é reduzido durante as falas. A mistura passou a 16 kHz para preservar mais detalhe.

Os 49 testes e a checagem de tipos passaram. Os novos casos conferem relógio entre os avisos, fim do relógio antes da cauda de conclusão, alinhamento do loop ao retomar, controle de som independente e redução do relógio sob a voz. A prévia de 28 segundos usa o renderer real e não contém samples saturados. A conferência por ffprobe confirmou o mesmo codec, taxa, canais e bitrate nos onze MP3s; os hashes confirmaram os originais intactos. A revisão auditiva no iPhone permanece necessária.

## Remoção do relógio de fundo

Após ouvir o resultado, o usuário pediu retirar ClockBackground. Removidos o loop contínuo, a redução de volume associada, o arquivo do relógio no repositório e sua dependência no empacotamento. A contagem 3–2–1 usa um bipe curto independente; permanecem as vozes e os efeitos de troca de fase/conclusão. As preferências voltaram a mostrar Bipes. Os 46 testes passaram, incluindo silêncio entre eventos na faixa real e após retomada; os três testes exclusivos do relógio contínuo foram retirados com a funcionalidade.

## Pastas e ordenação — validação local em 17/11/2026

Implementadas pastas opcionais de nomes livres, associação de modelos a uma pasta ou Sem pasta, movimentação, ordem manual de modelos e de pastas, recolhimento dos grupos e escolha de pasta ao salvar/atualizar. Excluir uma pasta preserva e move seus modelos para Sem pasta. Os registros antigos recebem folders vazio e folderId nulo por padrão na leitura; identificadores de pastas ausentes também retornam a Sem pasta. A configuração de treino e a execução ativa são independentes da organização.

Os 53 testes e a checagem de tipos passaram. Os novos testes verificam compatibilidade com dados anteriores, nomes, movimentação ao fim do destino, ordenação por grupo, exclusão sem perda e persistência. Um teste do componente real em JSDOM cobre criação/renomeação, setas, seletores, salvar diretamente em pasta, mudar de pasta ao atualizar, excluir, recarregar e manter a execução pausada intacta. O carregador do componente foi compartilhado com o teste já existente dos controles de áudio.

O build de produção e a verificação dos 25 recursos offline passaram; a rota local respondeu normalmente mantendo os campos em mm:ss. A conexão da ferramenta Browser falhou ao carregar seu serviço interno. Assim, a inspeção visual em navegador real permanece para o teste do usuário em localhost. Após disponibilizar a implementação local, o usuário autorizou commit e publicação.
