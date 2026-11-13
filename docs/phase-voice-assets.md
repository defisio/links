# Avisos de fase em português

Os avisos fixos foram gerados localmente em 13/11/2026 com [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M), modelo v1.0 sob Apache-2.0, e a implementação [kokoro](https://github.com/hexgrad/kokoro), versão 0.9.4. Foi usada a voz brasileira `pf_dora`, listada no [catálogo de vozes](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md). O modelo tem SHA256 `496dba118d1a58f5f3db2efc88dbdc216e0483fc89fe6e47ee1f2c53f18ad1e4` conforme o card do modelo.

O aplicativo distribui somente o áudio gerado, sem os pesos do modelo nem o sintetizador. Nenhum serviço remoto é consultado para anunciar fases ou exercícios; não há conta, envio de nomes de exercícios ou geração de voz online.

`lib/tabata/phase-voices.ts` contém PCM mono unsigned de 8 bits a 8 kHz, em base64, com decodificação em memória apenas quando a voz é utilizada. O renderer mistura o aviso correspondente no início de cada fase e inclui a conclusão no fim da faixa. Os bipes têm volume reduzido quando a voz está ligada. Pausa, retomada e salto usam os mesmos offsets do timer; avisos passados não são reproduzidos ao recuperar a execução.

`public/timer/voice-test.wav` contém “Teste de som”. `public/timer/unlock.wav` é um arquivo de silêncio de 100 ms, reproduzido uma única vez no gesto de início para desbloquear o player quando os bipes estão desativados. Não existe loop de silêncio.

## Regenerar os arquivos

A geração é opcional e não integra o build ou o CI do site. Requer Python 3.12, espeak-ng, ffmpeg e ambiente virtual com `kokoro==0.9.4` e `soundfile`:

```sh
python scripts/generate-phase-voices.py
```

No macOS pode ser necessário apontar `PHONEMIZER_ESPEAK_LIBRARY` para a biblioteca do espeak-ng instalada pelo Homebrew. O script baixa o modelo no ambiente de geração e normaliza os clipes antes da conversão para PCM. O resultado empacotado é aproximadamente 90 KB de código com as oito frases.

A regressão automatizada verifica conteúdo não silencioso e presença exata de cada clipe no WAV final, funcionamento apenas com voz, controles de bipes/voz independentes e recuperação sem avisos antigos. Isso não substitui escutar e validar o resultado em iPhone físico.
