# Master Games Arcade — Launcher do Sistema

Este repositório contém exclusivamente o código-fonte do **Master Games Arcade Launcher**, separado da landing page. O projeto inclui o launcher Electron, o servidor local de configuração, o perfil do controle arcade `VID_0079/PID_0006`, os arquivos de configuração do MAME, as artes do instalador e os manifestos de ROMs.

## Componentes principais

| Caminho | Função |
|---|---|
| `electron/main.cjs` | Processo principal do Electron |
| `electron/preload.cjs` | Ponte segura entre Electron e launcher |
| `dist/launcher.html` | Interface do launcher e painel de controles |
| `mame-server.js` | Servidor local, configuração do MAME, rotas de controles e diagnóstico HID opcional |
| `controls-profile.json` | Perfil editável do controle arcade DragonRise/Generic USB |
| `emulators/mame168/ctrlr/master-games-arcade.cfg` | Perfil de controles aplicado ao MAME |
| `emulators/mame168/cfg/default.cfg` | Configuração padrão do MAME |
| `build/installerHeader.bmp` | Arte superior do instalador |
| `build/installerSidebar.bmp` | Arte lateral do instalador |
| `diagnostico-controle-arcade.bat` | Diagnóstico do controle conectado no Windows |

## Controles

O painel permite escolher presets Universal/Auto, DragonRise/Generic USB 0079:0006, DirectInput, PlayStation/XInput e Manual. Também oferece captura individual, **captura guiada no estilo WinKawaks**, teste visual de botões e eixos, identificação do dispositivo, perfis P1/P2, exportação/importação, restauração do padrão e alerta de conflitos. A captura guiada percorre direções, seis botões, Start e Coin em sequência e remove o token capturado de qualquer ação anterior antes de salvá-lo. Para o cenário principal de um único encoder DragonRise, o dispositivo fica no P1, o seletor P2 mostra “não usado”, não são gerados `mapdevice` nem `JOYCODE_2_*` físicos e os comandos P2 permanecem apenas no teclado. A troca de preset apenas atualiza o painel; não reinicia o launcher nem o MAME. O mapa lógico P1/P2 é convertido para a gramática XML do MAME somente ao salvar. O mapa inicial do controle da foto separa soco/chute fraco, médio e forte, auxiliares, Start e Crédito; todos os campos permanecem editáveis.

## Diagnóstico HID

O launcher inclui `node-hid` como diagnóstico opcional. A rota local `/api/controls/hid` lista VID/PID, caminho HID, fabricante, produto, uso e interface quando o Windows expõe esses dados. Essa camada não captura eventos de gameplay e não disputa o controle com Gamepad/DirectInput; ela serve para confirmar o encoder e investigar outros controles sem alterar a compatibilidade do MAME.

## Binário MAME

O executável `emulators/mame168/mamep64.exe` é distribuído no **ZIP completo e no Release do GitHub**, junto com o `mame.ini`, os perfis de controle e a estrutura `ctrlr/cfg`. Ele não é mantido como arquivo individual no histórico Git por causa do tamanho; o ZIP completo contém o MAMEPlus 0.168.2 validado para o instalador.

## Instalação de dependências e desenvolvimento

```bash
pnpm install
node mame-server.js
```

Para gerar um instalador Windows, instale as dependências de build do projeto e use a configuração de empacotamento presente em `package.json`. O ZIP completo e o instalador incluem o MAMEPlus 0.168.2 em `emulators/mame168/mamep64.exe`; ROMs e BIOS continuam fora da distribuição pública e devem ser escolhidas pelo usuário na pasta de ROMs.

## Escopo

Este repositório é do **sistema executável/launcher**. A landing page possui projeto e repositório separados.
