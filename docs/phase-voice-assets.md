# Áudios do timer

Os áudios atuais foram fornecidos pelo usuário na pasta local `Music/Musicas`: oito falas em português, `ready.m4a` e `complete.m4a`. Substituem as falas geradas anteriormente com Kokoro e os efeitos sintetizados da faixa principal. Os arquivos originais permanecem intactos; seus hashes foram conferidos após o processamento. A origem e a licença dos downloads não foram informadas, portanto não se atribui a esses arquivos a licença Apache do gerador anterior.

## Arquivos preparados

`assets/tabata-audio/` contém cópias em MP3 mono, 24 kHz, 64 kbps, totalizando 99.512 bytes em vez de 350.283 bytes (redução de 71,6%). `audio-report.json` registra os arquivos de origem, hashes, durações, cortes e ajustes de ganho.

As vozes receberam cortes conservadores de silêncio com margens de proteção, ajuste de volume e pequenas rampas nas bordas. O efeito ready passou de 1,250 s para 0,733 s; o de conclusão passou de 2,874 s para 1,925 s. O arquivo ClockBackground foi removido do aplicativo a pedido do usuário. As cópias decodificadas não atingem o limite de amplitude; a prévia com todas as fases também não apresentou samples saturados.

A análise verifica formato, duração, silêncio e amplitude. Não equivale a uma avaliação auditiva do timbre nem de inteligibilidade em um iPhone físico.

## Reprodução no aplicativo

Os MP3s são as fontes compactas para manutenção e prévia. `lib/tabata/phase-voices.ts` empacota PCM mono unsigned de 8 bits a 16 kHz para mistura síncrona da faixa de mídia, sem requisições ou decodificação assíncrona durante o início do treino. A taxa dobrou em relação à versão anterior para preservar mais detalhe nas vozes. A precisão de 8 bits mantém a faixa longa limitada em memória; o WAV temporário usa aproximadamente 0,96 MB/minuto e mantém o limite de duas horas restantes.

A faixa contém as falas, bipes curtos na contagem 3–2–1, o efeito de mudança de fase e o de conclusão. Entre os avisos e os alertas há silêncio: não existe relógio ou áudio de fundo contínuo. O controle Bipes desativa os efeitos, mantendo Voz independente. Retomar, saltar e recuperar regeneram somente a sequência restante, sem repetir avisos antigos. A reprodução continua entregue ao mesmo player desbloqueado pelo toque, sem depender de callbacks de JavaScript em segundo plano.

O efeito de contagem agora é um bipe eletrônico curto de 650 Hz, gerado no empacotamento. Não depende mais de um recorte de ClockBackground. O arquivo de relógio e o código que o misturava foram removidos, inclusive do processo de preparação, para não reaparecerem na regeneração dos recursos.

`public/timer/` mantém WAVs curtos para Testar alertas, desbloqueio e fallback. Os nomes e URLs existentes foram preservados e continuam no cache offline. Nenhum áudio é enviado a serviço externo durante a execução.

## Preparar e empacotar

Com Python 3 e ffmpeg, sem instalar bibliotecas Python:

```sh
python3 scripts/prepare-timer-audio.py --source /caminho/para/os/originais
```

Cria `Timer-prontos` ao lado dos originais, copia os MP3s processados para `assets/tabata-audio/` e empacota o módulo/WAVs. A resolução de nomes aceita Unicode composto/decomposto dos arquivos do macOS. Para apenas reempacotar as fontes processadas do repositório:

```sh
python3 scripts/pack-timer-audio.py
```

Nenhuma dessas etapas é executada no build do site; os resultados são versionados. O antigo gerador Kokoro foi removido para impedir sobrescrita acidental com a voz e a taxa antigas.
