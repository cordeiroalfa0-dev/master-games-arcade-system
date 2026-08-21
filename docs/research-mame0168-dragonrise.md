# Pesquisa aplicada — DragonRise e MAME 0.168.2

## Conclusão operacional

A fonte histórica completa do tag `mame0168` não contém `mapdevice`/`map_device`; por isso o Master Games Arcade não deve gerar essa diretiva para o MAMEPlus 0.168.2. O sistema mantém o `ctrlr` com `<port>` e `<newseq>`, que é o mecanismo apropriado para as vinculações.

A documentação oficial de arquivos `ctrlr` informa que os tokens são dependentes da versão exata do MAME e do provider de entrada. Ela mostra `<port type="UI_MENU">`, `<port type="P1_BUTTON1">` e sequências `JOYCODE_1_BUTTON1`, e descreve `mapdevice` apenas na documentação moderna 0.289. A evidência histórica do código 0.168 prevalece para o pacote legado.

O issue público da Batocera sobre DragonRise relata que os problemas mais comuns são direções não reconhecidas, inversão física e confusão entre d-pad e analógico. O procedimento que funcionou foi salvar `default.cfg` gerado pelo MAME, configurar em “Inputs (general)” em vez de “Inputs (this machine)” e, quando necessário, usar um arquivo de configuração MAME customizado. O caso também alerta que RetroArch/EmulationStation pode usar mapeamentos diferentes do MAME standalone.

## Correções aplicadas

1. A geração de `<mapdevice>` foi removida de `mame-server.js`; a API passa a reportar `mapdeviceWritten: 0` e preserva a contagem de IDs ignorados para diagnóstico.
2. O launcher agora captura HAT1 a partir dos botões d-pad 12–15 antes de tratá-los como botões comuns.
3. A captura percorre até oito eixos: X, Y, Z, RX, RY, RZ, SLIDER1 e SLIDER2, gerando as variantes digitais `*_UP/DOWN/LEFT/RIGHT_SWITCH` para eixos e `*_POS/NEG_SWITCH` para sliders.
4. O helper `axisToken` ficou único; a guarda de geração e a remoção de tokens duplicados foram preservadas.
5. O teste automatizado foi atualizado para exigir zero diretivas XML `mapdevice device=...`, uma definição de cada helper e cobertura de HAT/eixos.

## Fontes

[1] MAME Documentation, “Controller Configuration Files”, versão 0.289: https://docs.mamedev.org/advanced/ctrlr_config.html

[2] Código-fonte oficial do tag MAME 0.168: https://github.com/mamedev/mame/tree/mame0168

[3] MAME `ioport.cpp` no tag 0.168: https://raw.githubusercontent.com/mamedev/mame/mame0168/src/emu/ioport.cpp

[4] Batocera Linux, issue #6680, “Dragonrise USB & Liberto: MAME emulator”: https://github.com/batocera-linux/batocera.linux/issues/6680

[5] RetroPie Forum, “Dragonrise controller not working in MAME emu, but is elsewhere”: https://retropie.org.uk/forum/topic/24097/dragonrise-controller-not-working-in-mame-emu-but-is-elsewhere
