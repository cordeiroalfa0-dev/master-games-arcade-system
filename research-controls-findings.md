# Pesquisa de compatibilidade de controles para Master Games Arcade

## Fontes consultadas

1. MAME Documentation — Controller Configuration Files: https://docs.mamedev.org/advanced/ctrlr_config.html
2. MAME Documentation — Stable Controller IDs: https://docs.mamedev.org/advanced/devicemap.html

## Conclusões técnicas

- O MAME usa arquivos XML `.cfg` no diretório definido por `ctrlrpath`; o perfil é ativado com `ctrlr` sem a extensão.
- Os tokens dependem da versão exata do MAME, dos dispositivos conectados e do provedor de entrada; portanto, não é seguro prometer um único mapa universal para todo controle.
- Elementos `<port type="P1_BUTTON1">` etc. com `<newseq type="standard">` permitem substituir atribuições padrão globais.
- `mapdevice` só funciona no arquivo selecionado por `-ctrlr`, não no `default.cfg`; deve ser usado para associar IDs estáveis a `JOYCODE_1`, `JOYCODE_2` etc.
- O MAME não garante que um controle receba sempre o mesmo número de joystick: reconectar USB/Bluetooth, hubs e a ordem de enumeração podem mudar o índice.
- IDs podem ser obtidos pelo menu Input Devices/Copy Device ID ou pelo log verbose (`-v`/`-verbose`), que registra `Input: Adding joystick`.
- Para o sistema, a estratégia correta é combinar: detecção Windows/Gamepad API; coleta do ID via BAT/verbose; perfis XInput/DirectInput/HID/arcade; captura manual dos botões; e `ctrlr` com `mapdevice` quando o ID real estiver disponível.

## Aplicação prevista

O launcher deve identificar o tipo do dispositivo, permitir perfil pronto e captura manual, salvar o perfil persistente e passá-lo explicitamente ao MAMEPlus. O BAT deve coletar os dados do Windows para personalizar o perfil quando a enumeração do controle não for suficiente.

## Fontes adicionais

3. MAMEdev Discussion — Input changes: phase 2: https://github.com/orgs/mamedev/discussions/26
4. Reddit r/cade — Mapping Stable Controller IDs in MAME with XInput: https://www.reddit.com/r/cade/comments/dsbdgq/mapping_stable_controller_ids_in_mame_with_xinput/

## Novas conclusões

- Builds Windows/SDL do MAME podem incluir módulos DirectInput, XInput e SDL; o provedor muda o comportamento e os identificadores.
- O MAME moderno tem atribuições padrão mais inteligentes conforme o tipo de controle, mas DirectInput não tem informação semântica suficiente para saber que botão é face/ombro; a configuração manual continua necessária para encoders e controles genéricos.
- XInput tende a oferecer identificadores legíveis como `XInput Player 1`, enquanto placas arcade em DirectInput podem expor IDs de instância mais estáveis.
- Um caso prático relatou IDs DirectInput no formato `instance_...` constantes após desconectar/reiniciar, enquanto a equivalência XInput não era tão simples de fabricar manualmente.
- A implementação deve coletar o ID real do MAME quando possível, usar `mapdevice` somente no arquivo `ctrlr`, e manter fallback por `JOYCODE_n` e captura manual.

## Provedores Windows

5. MAME Documentation — Universal Command-line Options: https://docs.mamedev.org/commandline/commandline-all.html
6. LaunchBox forum — Raw input in MAME: https://forums.launchbox-app.com/topic/39187-raw-input-in-mame/

A pesquisa indica que versões Windows do MAME aceitam, conforme a build, `auto`, `winhybrid`, `dinput`, `xinput` ou `none` para `joystickprovider`. A estratégia segura para o MAMEPlus 0.168.2 é preservar `auto` como padrão, oferecer perfis explícitos para DirectInput/arcade e XInput somente após detectar o dispositivo, e nunca forçar um provedor sem validar a build instalada.

## Validação real do executável embutido

O executável encontrado foi identificado em `/tmp/mga-full-source/emulators/mame168/mamep64.exe` como **M.A.M.E. v0.168.2 Smooth Ver.2 (Apr 23 2017)**. A execução real via Wine confirmou que `-showconfig` lista `ctrlrpath`, `ctrlr`, `joystick`, `joystick_map`, `joystick_deadzone` e `joystick_saturation`.

O teste explícito de `-joystickprovider auto`, `winhybrid`, `dinput` e `xinput` retornou `Error: unknown option: -joystickprovider` em todos os casos. Portanto, o sistema não deve forçar esse parâmetro nessa versão. A implementação foi corrigida para usar o backend nativo da build, manter `-joystick`, deadzone/saturation e aplicar o arquivo `ctrlr` com `-ctrlrpath`/`-ctrlr`.

## Identificação do controle do usuário

O relatório do BAT identifica o dispositivo como **Generic USB Joystick**, com `Vendor/Product ID: 0x0079, 0x0006`, `Controller ID: 0x0` e driver DirectInput/HID ativo no Windows 10. Esse VID/PID é associado em registros do SDL a encoders DragonRise/Generic USB Joystick [1].

A pesquisa também mostra que o mesmo VID/PID pode aparecer em placas fisicamente diferentes e com mapeamentos distintos; portanto, VID/PID identifica a família do encoder, mas não prova a ordem física de cada botão [1]. O perfil específico será baseado no padrão arcade comum e continuará permitindo captura manual por botão para corrigir qualquer variação.

### Fontes

[1] [SDL Issue #3197 — Different game controllers, different mappings, same GUID](https://github.com/libsdl-org/SDL/issues/3197)
[2] [MAME controller configuration documentation](https://docs.mamedev.org/advanced/ctrlr_config.html)


## Achados adicionais do segundo diagnóstico

O diagnóstico confirmou seis problemas relacionados: tokens HAT sem índice (`JOYCODE_1_HATUP` em vez de `JOYCODE_1_HAT1UP`), composição de captura com `OR` inicial quando o binding anterior está vazio, captura de P2 escrevendo JOYCODE_2 mesmo quando o segundo player compartilha o primeiro dispositivo, ausência de `mapdevice` no arquivo ctrlr, dependência instável entre índice da Web Gamepad API e índice do MAME, e filtragem de gamepads que reindexa buracos de `navigator.getGamepads()`.

A correção deve incluir sanitização/whitelist de tokens, mapa explícito de dispositivos por jogador, suporte a dois players no mesmo JOYCODE_1, captura limpa de sequências, regex HAT numerado e emissão de `mapdevice` somente no arquivo ctrlr indicado por `-ctrlr`. Os arquivos principais são `dist/launcher.html`, `mame-server.js`, `controls-profile.json`, `emulators/mame168/ctrlr/master-games-arcade.cfg` e `emulators/mame168/mame.ini`.


## Confirmação na documentação oficial do MAME

A documentação oficial confirma que o arquivo `ctrlr` é XML, deve estar em `ctrlrpath` e é selecionado por `ctrlr` sem a extensão. Ela também confirma que `mapdevice` só tem efeito dentro do arquivo de controlador selecionado por `-ctrlr`, usando `device` e `controller`, e que os IDs podem variar conforme enumeração, USB, Bluetooth, hubs e provedor de entrada. [3] [4]

A mesma documentação mostra que sequências `newseq` podem combinar entradas com `OR`, mas os tokens dependem da versão, dispositivos, provedor e configurações. Portanto, o teste deve validar a build MAME 0.168.2 específica, e não somente a documentação moderna. [3]

Referências:

[3] [MAME Controller Configuration Files](https://docs.mamedev.org/advanced/ctrlr_config.html)
[4] [MAME Stable Controller IDs](https://docs.mamedev.org/advanced/devicemap.html)
[5] [MAME Universal Command-line Options](https://docs.mamedev.org/commandline/commandline-all.html)
