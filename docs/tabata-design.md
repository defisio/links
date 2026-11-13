# Desenho do aplicativo Tabata

Status: entendimento confirmado pelo usuário na Q17 e implementação concluída no checkout. A validação automatizada e as limitações de verificação estão registradas em [tabata-validation.md](tabata-validation.md).

## Requisitos estabelecidos pelo usuário

- Adicionar uma rota ao site de links existente.
- Priorizar uso no celular, com adaptação ao modo paisagem.
- Configurar preparação, exercício, descanso e quantidade de ciclos, com séries, pausa entre séries, aquecimento e desaquecimento.
- Exibir a contagem da fase com números grandes, além do tempo total e do tempo restante do treino.
- Identificar as fases por cores e oferecer temas escuro e de alto contraste.
- Oferecer iniciar, pausar, retomar, pular fase e reiniciar.
- Oferecer alertas sonoros, vibração, nomes de exercícios e anúncios por voz.
- Incluir o modelo clássico de 20 segundos de exercício, 10 segundos de descanso e 8 ciclos.
- Permitir criar, nomear, editar e excluir modelos de treino.
- Permitir favoritar, excluir e renomear últimas execuções.
- Manter os dados no próprio navegador, sem banco de dados externo online; ver [ADR 0001](adr/0001-dados-do-tabata-no-navegador.md).
- Calcular o tempo correto ao retornar do segundo plano e buscar impedir bloqueio automático durante o uso visível, aceitando os limites dos navegadores.
- Oferecer integração dos alertas com música e vibração conforme a capacidade do aparelho, sem impedir o treino quando indisponíveis.

## Contexto verificado no repositório

- Next.js com App Router, React e exportação estática.
- A rota interna é `/timer/`, publicada e acessada localmente em `/links/timer/` com o mesmo `basePath: /links`. O usuário autorizou esse endereço no GitHub Pages existente e pediu paridade no desenvolvimento local. A página de links permanece em `/links/`.
- A página atual tem a marca Débora Eduarda.

## Árvore de decisões

### Primeira rodada: decisões confirmadas

1. **Hierarquia:** treino → séries → repetições. Repetição significa um intervalo cronometrado de exercício, não contagem de movimentos. Evitar ronda. Ver [glossário](../GLOSSARY.md).
2. **Histórico:** registrar a execução ao iniciar, com resultado concluído ou interrompido; permitir repetir, favoritar, renomear e excluir. Os modelos salvos são independentes e sua edição não altera execuções registradas.
3. **Visual:** manter a marca Débora Eduarda, tema escuro inicial, números enormes, cor e texto identificando a fase, adaptação à paisagem e ajustes fora da área principal do cronômetro.
4. **Plataforma:** versão web para iPhone e Android, tempo correto ao retornar do segundo plano e tentativa de manter a tela acesa com o treino visível; o usuário aceita que alertas possam falhar durante suspensão/bloqueio. Ver [ADR 0002](adr/0002-tabata-web-com-limites-de-segundo-plano.md).
5. **Capacidades:** vibração e redução da música de outros aplicativos são melhorias opcionais conforme o aparelho; bipes e voz são configuráveis.

### Segunda rodada: decisões confirmadas

6. **Sequência:** preparação única (10s por padrão), aquecimento opcional, séries e desaquecimento opcional. A pausa entre séries substitui o descanso comum ao final das séries intermediárias. A última série inclui o descanso após seu último exercício. Aquecimento e desaquecimento começam em zero e são omitidos nesse caso.
7. **Exercícios:** uma lista com um nome por repetição, repetida em todas as séries; tempos de exercício e descanso iguais para todas as repetições. Nomes vazios recebem “Exercício 1”, “Exercício 2” etc.
8. **Recuperação:** uma execução ativa por vez. Ao retornar de outro aplicativo ou recarregar, uma execução em andamento avança segundo o tempo real, inclusive concluindo se o tempo acabou; uma execução pausada permanece pausada. Não reproduzir alertas perdidos em sequência.
9. **Exibição:** tempo restante da fase em destaque; exercício atual, próxima atividade, série e repetição atuais, tempo restante do treino, duração planejada e progresso geral também visíveis. Pausas manuais congelam a contagem e não aumentam a duração planejada.
10. **Disponibilidade:** instalação opcional na tela inicial e uso offline após o primeiro carregamento completo, além do funcionamento no navegador.
11. **Alertas:** voz ativada por padrão, juntamente com bipes para 3–2–1 e troca de fase e vibração quando disponível. Voz anuncia a fase e o exercício, sem duplicar a contagem dos bipes. Preferências persistidas e possibilidade de testar antes de iniciar.
12. **Persistência:** exportação/importação dispensadas nesta versão. A proposta de 100 execuções recentes, preservando favoritas fora do limite, foi mantida ao retirar o backup; essa interpretação foi comunicada ao usuário.

### Terceira rodada: decisões confirmadas

13. **Pular:** avançar apenas a fase atual e retirar seu tempo restante do restante do treino, preservando a duração originalmente planejada como referência. Se estava pausado, continuar pausado na próxima fase. Pular a última fase conclui a execução, registrando que houve fases puladas.
14. **Encerrar e reiniciar:** incluir Encerrar treino. Confirmar encerramento, reinício ou substituição por outro treino enquanto existir uma execução ativa. Encerrar marca a execução como interrompida; reiniciar também interrompe a anterior e cria uma nova desde a preparação. Pausar, retomar e pular não exigem confirmação.
15. **Independência dos registros:** Repetir carrega a configuração da execução para revisão e aguarda Iniciar. Renomear ou excluir uma execução não altera seu modelo; editar ou excluir um modelo não altera o histórico nem a execução ativa. Alterações de configuração durante uma execução valem somente para o próximo treino.
16. **Configuração em edição e validação:** salvar os ajustes automaticamente, mesmo sem modelo nomeado. Preparação, descanso, pausa entre séries, aquecimento e desaquecimento podem ser zero e são omitidos nesse caso. Exercício deve ser maior que zero; séries e repetições são inteiros a partir de 1. Pausa entre séries zero leva diretamente à próxima série.

## Duração do treino

Com `P` = preparação, `A` = aquecimento, `S` = séries, `R` = repetições por série, `E` = exercício, `D` = descanso comum, `B` = pausa entre séries e `C` = desaquecimento, a sequência aprovada implica:

```text
total = P + A + S × R × E + (S × (R − 1) + 1) × D + (S − 1) × B + C
```

A última série inclui seu descanso final; nas séries anteriores, a pausa entre séries substitui esse descanso.

Exemplos para os critérios de aceitação:

- 1 série × 8 repetições de 20s/10s = 4min; com preparação de 10s = 4min10s.
- 2 séries × 2 repetições de 20s/10s, pausa entre séries de 60s e preparação de 10s = 3min.
- Acrescentar aquecimento ou desaquecimento aumenta o total exatamente pela duração configurada.
- 2 séries × 2 repetições de 20s/10s, preparação de 10s e pausa entre séries zero = 2min; o descanso da fronteira entre séries não é acrescentado novamente.

## Comportamento consolidado

### Tela e navegação

- Acrescentar acesso ao Tabata na página de links e servir o aplicativo em `/links/timer/` tanto localmente quanto no GitHub Pages.
- Manter a marca Débora Eduarda, com tema escuro inicial e opção de alto contraste.
- Priorizar celular em retrato e paisagem, com botões grandes, números legíveis a distância e informações que não dependam só de cores.
- Usar amarelo para preparação, verde para exercício e vermelho para descanso, identificando aquecimento, pausa entre séries e desaquecimento por seus nomes e cores distinguíveis.
- Manter a configuração fora da área principal do cronômetro; exibir fase, exercício, próxima atividade, série/repetição, duração planejada e tempo restante.

### Execução e relógio

- O modelo clássico parte de 1 série, 8 repetições, exercício de 20s, descanso de 10s, preparação de 10s e aquecimento/desaquecimento desativados: total de 4min10s.
- Gerar a sequência a partir da configuração validada, omitindo fases com duração zero e repetindo a lista de exercícios em cada série.
- Registrar a configuração da execução ao iniciar, independentemente de alterações posteriores no modelo ou nos ajustes em edição.
- Calcular a posição pela passagem real do tempo e pelas pausas registradas; não depender da quantidade de atualizações de tela para contar segundos.
- Recuperar execução em andamento, pausada ou já encerrada pelo tempo ao retornar ou recarregar, sem reproduzir alertas atrasados em sequência.
- Garantir uma execução ativa por vez no mesmo navegador, inclusive coordenando abas para evitar contagem e alertas duplicados. Essa coordenação é consequência do requisito de execução única, não sincronização entre dispositivos.
- Pular retira somente o restante da fase atual; duração planejada permanece estável, o restante diminui e o histórico preserva a indicação de fases puladas.
- Pausas manuais não contam como tempo de treino; interrupção e reinício obedecem às confirmações da decisão 14.

### Dados e personalização

- Separar modelos de treino, histórico de execuções, execução ativa, preferências e configuração em edição.
- Criar, nomear, editar e excluir modelos personalizados, além de oferecer o clássico como ponto de partida.
- Registrar execuções desde Iniciar e permitir repetir, favoritar, renomear e excluir seus registros, sem modificar modelos associados.
- Conservar 100 execuções recentes não favoritas, preservar favoritas fora desse limite e nunca remover a execução ativa para liberar histórico.
- Manter os dados exclusivamente no navegador. Sem conta, banco de dados online, sincronização entre dispositivos ou exportação/importação nesta versão.
- Persistir também tema e preferências de som, voz e vibração.

### Áudio e disponibilidade

- Bipes de 3–2–1 e troca de fase, voz e vibração disponível começam ativados.
- Voz anuncia fase e exercício e não duplica a contagem dos bipes. Oferecer teste dos alertas e controles independentes de preferência.
- Recursos indisponíveis não impedem iniciar. Evitar sobreposição de anúncios de fases antigas ao transitar rapidamente ou retornar à página.
- Solicitar Wake Lock durante execução visível e tentar readquiri-lo ao retornar; liberar ao pausar ou encerrar. Indicar se a tela está sendo mantida acesa ou se o recurso não está disponível.
- Tratar a redução da música de outros aplicativos como melhoria condicionada ao suporte da plataforma.
- Oferecer instalação opcional e funcionamento offline após carregamento completo dos recursos do aplicativo. A disponibilidade de vozes offline depende do dispositivo e não deve bloquear o cronômetro.
- Evitar aplicar atualizações do aplicativo no meio de uma execução ativa.

## Ordem de implementação e critérios de aceitação

### 1. Sequência e estado do cronômetro

Implementar geração das fases, cálculo de duração, relógio, pausas, saltos e conclusão de forma verificável sem depender da interface.

Aceitar quando os exemplos de duração deste documento forem reproduzidos, fases zero forem omitidas, o descanso entre séries substituir o comum e pular/pausar/retomar preservarem a posição correta. Verificar também a última fase pulada e a recuperação após várias fases transcorridas.

### 2. Rota e interface para celular

Construir a configuração e a tela de execução, aplicar a marca e os temas, adaptar retrato/paisagem e integrar o acesso à página de links.

Aceitar quando for possível configurar e executar o clássico, acompanhar fase e progresso total e operar todos os controles sem rolagem ou sobreposição prejudicial na área do cronômetro. A identidade textual da fase e controles acessíveis devem continuar compreensíveis sem distinguir cores.

### 3. Persistência, modelos e histórico

Adicionar armazenamento local com versão de formato, preservação da configuração em edição, modelos independentes, histórico e recuperação da execução ativa.

Aceitar quando recarregar preservar configurações e preferências; edição ou exclusão de modelos não alterar registros anteriores; Repetir aguardar Iniciar; reinício criar outra execução; favoritas sobreviverem ao limite de 100 recentes; e abas não criarem execuções ou alertas concorrentes. Dados inválidos ou falha de armazenamento devem ser tratados sem derrubar a tela.

### 4. Alertas e recursos do aparelho

Integrar bipes, voz, vibração, Wake Lock e interação com música conforme disponibilidade.

Aceitar quando as preferências forem respeitadas, a voz começar ativada, os alertas puderem ser testados, não houver repetição de anúncios perdidos e a falta de uma API não impedir o treino. Validar no navegador disponível; testes em iPhone/Android físicos devem distinguir o que foi observado do que foi apenas simulado.

### 5. Instalação, offline e validação de publicação

Adicionar manifest, recursos de instalação e cache offline respeitando o prefixo de publicação e a rota do Tabata. Garantir metadados próprios da rota sem herdar canonical da página inicial.

Aceitar quando a exportação estática e a verificação de tipos passarem, o acesso direto à rota `/links/timer/` funcionar com os recursos sob o mesmo prefixo, o aplicativo já carregado abrir offline e os fluxos principais forem verificados nos tamanhos de celular e paisagem. Não declarar garantidos os alertas durante suspensão do navegador.

## Limites de plataforma verificados

- O navegador pode limitar ou suspender a execução de páginas em segundo plano. Não há garantia portátil de disparar bipes e anúncios por voz enquanto a página está suspensa, inclusive quando instalada como PWA. Fontes: [WebKit](https://webkit.org/blog/8970/how-web-content-can-affect-power-usage/) e [Chrome](https://developer.chrome.com/docs/web-platform/page-lifecycle-api).
- Calcular a fase a partir do tempo transcorrido ao retornar é uma proposta de implementação; isso não significa executar os alertas durante a suspensão.
- O Screen Wake Lock funciona com documento visível e pode ser negado ou revogado por condições do sistema, como bateria baixa. Fonte: [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API).
- A interação com música de outros aplicativos depende da plataforma. A Audio Session API tem disponibilidade limitada e seu modo `transient` pode reduzir o volume de outro áudio, sem constituir uma garantia uniforme. Fonte: [MDN](https://developer.mozilla.org/en-US/docs/Web/API/AudioSession/type).
- Vibração é opcional por compatibilidade e não está disponível no Safari do iPhone. Fonte: [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate).

## Encerramento da entrevista

Não há perguntas de produto em aberto. A retenção de 100 recentes com favoritas preservadas foi explicitada na revisão final. Na Q17, o usuário confirmou: “Sim, entendimento fechado; pode implementar”. A implementação seguiu esse escopo.
