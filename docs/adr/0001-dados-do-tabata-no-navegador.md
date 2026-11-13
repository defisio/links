# Manter os dados do Tabata no próprio navegador

As configurações, os modelos de treino e as últimas execuções do Tabata serão mantidos no navegador do usuário, conforme o requisito explícito de não usar banco de dados externo online. Essa escolha permite acrescentar o aplicativo ao site estático existente e dispensa conta e sincronização por servidor, em troca de os dados ficarem restritos ao navegador e ao dispositivo usados.

A limpeza dos dados do site pode remover os registros locais. Exportação e importação foram dispensadas nesta versão. Serão preservadas as 100 execuções recentes, as favoritas fora desse limite, os modelos, as preferências, a configuração em edição e os dados necessários para recuperar a execução ativa pelo tempo real transcorrido. Uma execução pausada permanece pausada após recarregar.
