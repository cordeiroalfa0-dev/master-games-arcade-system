# Conferência visual final — Master Games Arcade

Data: 18/08/2026.

A tela real do launcher foi aberta com o backend atualizado e o modal `CONFIGURAÇÃO DOS CONTROLES` foi exibido. O seletor visual contém: `Universal / Auto`, `DragonRise / Generic USB 0079:0006`, `Arcade / DirectInput`, `PlayStation / XInput` e `Configuração manual`.

O modal mostra linhas de configuração para P1 e P2, incluindo direções, oito botões, Start e Coin, além dos comandos de menu. Cada linha possui `CAPTURAR`. O modal também apresenta `SALVAR NO MAME` e `FECHAR`.

A captura foi feita sem um controle físico conectado ao sandbox; por isso o indicador visual mostra `Conecte o controle`. A detecção do controle do usuário será feita no Windows pelo Gamepad API e pelo perfil específico DragonRise baseado no relatório `Generic USB Joystick`, VID `0079`, PID `0006`.

Testes técnicos já concluídos antes desta evidência:

- Backend e Electron com sintaxe válida.
- Perfil DragonRise presente no endpoint e no HTML.
- P1/P2 persistidos em `default.cfg` e `ctrlr/master-games-arcade.cfg`.
- MAMEPlus real identificado como `M.A.M.E. v0.168.2 Smooth Ver.2`.
- `joystick`, `ctrlrpath` e `ctrlr` aceitos pelo MAMEPlus.
- BIOS `neogeo.zip`, KOF94 e KOF95 com ZIP íntegro.
- KOF94 e KOF95 permaneceram ativos por 18 segundos usando caminhos absolutos e o perfil de controles, sem erro de ROM, BIOS, argumento ou arquivo de controle.

Pendência antes da compilação: conferir o conteúdo final do pacote após incluir explicitamente `emulators/**/*`, `diagnostico-controle-arcade.bat` e a BIOS na configuração de build; depois gerar hashes e entregar somente após autorização do usuário.

## Segunda evidência visual

O perfil `DragonRise / Generic USB 0079:0006` foi selecionado no seletor do modal. A tela exibiu os mapeamentos padrão de P1 e P2, os botões `CAPTURAR`, `SALVAR NO MAME` e `FECHAR`. Como esperado no sandbox, o indicador ainda mostra `Conecte o controle`, pois o controle físico está no computador do usuário, não no ambiente de teste.

Screenshot: `/home/ubuntu/screenshots/page_2026-08-18_22-14-47_8798.webp`.
