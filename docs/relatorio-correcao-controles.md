# Relatório de correção — Master Games Arcade

## Estado da entrega

O sistema foi corrigido no repositório `/tmp/mga-unified-controls`. **Nenhum EXE ou instalador foi gerado.** A entrega desta etapa contém correções de código, testes técnicos, uma tela visual de diagnóstico e validação da geração do CFG em ambiente temporário.

## Correções aplicadas e verificadas

| Área | Resultado |
|---|---|
| Dois pads com o mesmo nome/ID | `padKey` usa o índice do navegador, evitando colisão entre `index:0` e `index:1`. |
| P1/P2 | `padMap` guarda a seleção do navegador; `joycodeMap` guarda o `JOYCODE` calculado. |
| Encoder compartilhado | P1 e P2 podem apontar para o mesmo `padKey` e usar `JOYCODE_1`. |
| Dois encoders separados | Índices distintos produzem `JOYCODE_1` e `JOYCODE_2`. |
| Captura concorrente | A geração da captura invalida loops de polling antigos. |
| P2_BUTTON3 | O cenário separado gera `JOYCODE_2_BUTTON3`; o cenário compartilhado gera `JOYCODE_1_BUTTON3`. |
| HATs | As sequências usam `HAT1UP`, `HAT1DOWN`, `HAT1LEFT` e `HAT1RIGHT`; não há HAT sem índice nos arquivos validados. |
| `OR` | Não foram encontrados `OR` no início ou no fim das sequências testadas. |
| `mapdevice` | O servidor emite regras somente quando recebe IDs MAME reais, distintos e associados a `JOYCODE_n`. |
| XML | O CFG foi parseado com sucesso e contém 35 portas no perfil-base. |

## Testes executados

A suíte `tests/control-mapping.test.mjs` passou, verificando pads idênticos, encoder compartilhado, cálculo de P1/P2, P2_BUTTON3, validação de HAT, guarda de geração e presença do gerador `mapdevice`.

A página `tests/control-diagnostics.html` foi aberta no navegador e mostrou visualmente **TODOS OS TESTES PASSARAM**. A tela apresenta os dois cenários, os índices dos pads, os `padKey`, a atribuição P1/P2 e a sequência da captura de `P2_BUTTON3`. A simulação visual também registrou que uma nova captura invalida gerações anteriores.

A API real do servidor foi exercitada com um diretório temporário. O POST de perfil produziu dois `mapdevice` distintos:

```xml
<mapdevice device="DragonRise instance_A" controller="JOYCODE_1" />
<mapdevice device="DragonRise instance_B" controller="JOYCODE_2" />
```

O mesmo CFG temporário gerou `P2_BUTTON3` como `KEYCODE_Q OR JOYCODE_2_BUTTON3` e manteve os tokens HAT no formato `HAT1`.

## Limitação que permanece

A validação realizada aqui confirma a lógica do sistema e a geração dos arquivos, mas não substitui o teste final em Windows com as placas conectadas e o MAMEPlus 0.168.2 real. Para fechar essa última etapa, ainda é necessário executar o MAME com `-verbose`, copiar os IDs completos que ele exibir e informar esses IDs no painel. VID/PID `0079:0006` ou o nome `Generic USB Joystick` não distinguem sozinhos duas placas idênticas.

## Arquivos relevantes

`dist/launcher.html` contém a lógica do painel e da captura. `mame-server.js` contém a persistência, o cálculo do perfil e a geração de `default.cfg`/`ctrlr`. `tests/control-mapping.test.mjs` contém a suíte técnica. `tests/control-diagnostics.html` contém a visualização dos testes.
