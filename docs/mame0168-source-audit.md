# Auditoria MAME 0.168 — conclusão

## Resultado
O tag histórico `mame0168` do repositório oficial foi baixado e pesquisado em todo o código sob `src` e `scripts`. A busca exata por `mapdevice` e `map_device` não encontrou nenhuma ocorrência. A busca específica em `src/emu/ioport.cpp` também não encontrou a diretiva.

A documentação atual do MAME descreve `mapdevice` como elemento XML dentro de arquivos `ctrlr`, mas essa documentação não deve ser aplicada automaticamente ao binário antigo 0.168. Como o parser do MAME 0.168 não contém a diretiva, a geração de `<mapdevice>` para MAMEPlus 0.168.2 deve ser removida ou desativada para evitar XML ignorado ou inválido.

A solução compatível para 0.168 é manter o arquivo `ctrlr` com sequências `JOYCODE_n`, usar `ctrlrpath` relativo e não emitir `<mapdevice>`. IDs HID/verbose continuam úteis para diagnóstico, mas não devem ser convertidos em `mapdevice` nessa versão.

## Tokens
O código histórico contém macros/tokens `JOYCODE_*`, incluindo eixos X/Y e botões. A camada OSD trata controles analógicos e equivalentes digitais; a captura do launcher deve cobrir X/Y, eixos adicionais quando disponíveis e HATs, mas deve emitir somente tokens que o MAME 0.168 reconhece.

## Fontes
- Tag MAME 0.168: https://github.com/mamedev/mame/tree/mame0168
- `ioport.cpp` do tag 0.168: https://raw.githubusercontent.com/mamedev/mame/mame0168/src/emu/ioport.cpp
- Documentação atual de IDs estáveis: https://docs.mamedev.org/advanced/devicemap.html
- Issue MAME Testers sobre IDs duplicados: https://mametesters.org/view.php?id=7200
