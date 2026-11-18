# Configuração white label

Nesta primeira etapa, o checkout continua sendo o site da Débora. O código compartilhado lê `site.config.json`; ainda não há dependência de repositório central, sincronização entre repositórios ou configuração de Rodrigo.

## Arquivo de configuração

| Campo | Finalidade |
| --- | --- |
| `schemaVersion` | Formato da configuração; atualmente `1`. |
| `id` | Identidade persistente do site, usada nas chaves de dados e coordenação do timer. |
| `site.origin` | Origem pública, como `https://defisio.github.io`, sem caminho ou barra final. |
| `site.basePath` | Caminho do projeto, como `/links`, sem barra final. Usar `""` para domínio próprio na raiz ou site de usuário/organização na raiz. |
| `site.language` / `site.locale` | Idioma do documento e identificação de idioma para compartilhamento. |
| `profile` | Nome, profissão, apresentação, contatos, localização e especialidades. |
| `assets` | Foto, logo opcional, favicon e imagem de compartilhamento. |
| `theme.home` | Paleta da página de links, no formato `H S% L%`, por exemplo `168 70% 50%`. |
| `theme.timer` | Paleta base e destaques do Tabata, em hexadecimal. As cores funcionais das fases e o modo de alto contraste permanecem próprios do timer. |
| `links` | Links, ordem, ícones, descrições e presença no rodapé. |
| `features.tabata` | Habilita ou remove o Tabata da exportação. |
| `seo` | Títulos, descrições, verificação do Google e dados estruturados opcionais do negócio. |
| `timer` | Nome, descrições, nome de instalação e ícones do aplicativo. |

Os caminhos de imagens começam com `/`, relativos a `public/`, **sem repetir `basePath`**. Por exemplo, `/avatar.png` aponta para `public/avatar.png`; o código acrescenta `/links` automaticamente. URLs de links externos são mantidas.

`assets.avatar`, `assets.logo` e `assets.socialImage` incluem `src`, `alt`, `width` e `height`. O logo é opcional. Para o Tabata, fornecer SVG e PNGs de 192 × 192 e 512 × 512, além de um PNG maskable de 512 × 512 com margem adequada. Os arquivos atuais são preservados nos mesmos caminhos.

Não colocar senhas, tokens ou credenciais no JSON: seu conteúdo é público e pode integrar os arquivos enviados ao navegador.

## Links

Exemplo de um link:

```json
{
  "id": "contato",
  "icon": "whatsapp",
  "href": "https://wa.me/5500000000000",
  "label": "WhatsApp",
  "description": "Fale comigo diretamente",
  "showInFooter": true
}
```

Ícones disponíveis: `whatsapp`, `instagram`, `email`, `youtube`, `tiktok`, `linkedin`, `twitter`, `spotify`, `globe` e `timer`. Cada `id` deve ser único. A ordem no JSON define a ordem na página e no rodapé.

Aceita URLs HTTP/HTTPS, `mailto:`, `tel:` e caminhos internos como `/timer/`. Para associar um link ao recurso Tabata, usar `"feature": "tabata"`.

## Dados já existentes da Débora

**Preservar `id: "de-fisio"` ao atualizar este site.** Ele mantém as chaves `de-fisio.tabata.v1`, `de-fisio.tabata.alerts` e os nomes de locks e canal de áudio existentes. Não é necessário migrar ou apagar os dados dos usuários.

Um novo profissional deve receber um `id` diferente. O armazenamento continua no navegador, sem contas ou banco de dados externo. Mudar de domínio/origem não transfere os dados salvos automaticamente. Se mudar apenas o caminho no mesmo domínio, manter o `id` conserva os dados.

Os caches offline novos são separados por caminho de instalação e build. Uma atualização limpa apenas os caches novos do seu próprio caminho; caches antigos do formato anterior ficam preservados para evitar apagar dados offline de outros sites. O worker continua aguardando o encerramento de sessões antigas antes de assumir o controle.

## Tabata opcional

Com `features.tabata: false`, a página do timer responde como não encontrada, seus links são omitidos, o sitemap lista apenas a página principal e o pós-build remove `out/timer/`, incluindo os áudios e o worker. Isso afeta novas publicações; uma instalação antiga já guardada no navegador pode continuar acessível offline.

## Build e validação

`yarn check:config` valida o formato e a existência das imagens configuradas. O mesmo passo roda antes do build. Campos desconhecidos, links inseguros, cores inválidas, caminhos incorretos e ids duplicados interrompem a geração com o campo do erro.

`yarn build` gera o site, `robots.txt`, `sitemap.xml` e o manifesto do timer a partir da configuração, e prepara o worker com o identificador do build e os caminhos dos ícones. `yarn check:site-export` verifica identidade, links, imagens, metadados, dados estruturados e sitemap. Quando o timer está ativo, também verifica o manifesto e seus recursos reais em um ambiente simulado de worker offline.

A mesma fonte Plus Jakarta Sans usada na versão anterior está incluída localmente em `assets/fonts/`, com sua licença OFL. O build e o carregamento do site não precisam consultar o Google Fonts.

`yarn test` executa toda a suíte; `yarn test:tabata` executa apenas os testes do timer. A simulação não substitui uma conferência de instalação, áudio e segundo plano em iPhone/Android físicos.

## Próxima etapa: repositórios

Depois de definir o central e o repositório do Rodrigo, extrair o código compartilhado e manter os dados de cada profissional no seu próprio repositório. O processo de publicação combinará uma versão fixa do central com a configuração e os assets do profissional. Distribuição de versões e permissões entre repositórios serão conectadas nessa etapa.

## Validação local desta etapa — 18/11/2026

- 62 testes passaram, incluindo os testes anteriores do timer, configuração de outro perfil, compatibilidade das chaves da Débora e isolamento de caches por caminho.
- Checagem de tipos e build de produção passaram.
- A exportação final da Débora foi verificada, incluindo os 22 recursos no ambiente simulado de worker offline.
- Builds temporários reais passaram para outro perfil na raiz do domínio, com outra paleta e ícones fora de `/timer/`, e para `/consultorio` com o Tabata desativado. A verificação da raiz confirmou a ausência dos dados textuais da Débora no HTML. A configuração original foi restaurada e o site da Débora foi gerado e verificado novamente.
- As rotas, tipos de conteúdo, redirecionamento para barra final e resposta 404 fora do caminho configurado foram conferidos por HTTP no servidor local.
- A home e o Tabata foram inspecionados no Chrome em janela anônima. O timer informou disponibilidade offline após preparar seus recursos. Essa observação não equivale a uma recarga offline ou a um reteste de áudio em iPhone físico.
- Alterações mantidas no checkout local, sem commit, push ou publicação nesta etapa.
