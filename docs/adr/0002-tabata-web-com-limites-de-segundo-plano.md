# Oferecer o Tabata na web com limites explícitos de segundo plano

O usuário confirmou que o Tabata será uma aplicação web para iPhone e Android dentro do site existente. O aplicativo buscará manter a tela acesa durante o treino visível e calculará a posição correta do cronômetro ao retornar de outro aplicativo, aceitando que a suspensão da página pelo sistema pode impedir alertas sonoros e anúncios de voz durante o bloqueio de tela ou uso em segundo plano.

Essa decisão mantém a distribuição pela rota do site, em vez de exigir uma aplicação com recursos nativos para cumprir uma garantia de alertas em segundo plano. A instalação opcional na tela inicial e o uso offline após o primeiro carregamento completo foram aprovados. Instalar como PWA não elimina os limites de suspensão do navegador.

Vibração e redução temporária do volume da música de outros aplicativos serão melhorias condicionadas às capacidades do aparelho. Sua indisponibilidade não impedirá iniciar o treino. Bipes e anúncios por voz serão configuráveis.

Referências: [ciclo de vida no Chrome](https://developer.chrome.com/docs/web-platform/page-lifecycle-api), [suspensão no WebKit](https://webkit.org/blog/8970/how-web-content-can-affect-power-usage/), [Screen Wake Lock](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API) e [Audio Session](https://developer.mozilla.org/en-US/docs/Web/API/AudioSession/type).

Após o teste online no iPhone, o usuário passou a exigir bipes mesmo no silencioso e em segundo plano. O [ADR 0003](0003-bipes-como-faixa-de-audio.md) registra a mudança para uma faixa de mídia pré-renderizada. Os limites de suspensão continuam relevantes para a interface, a vibração e os novos anúncios de voz; os bipes da faixa não dependem de novos disparos por JavaScript.
