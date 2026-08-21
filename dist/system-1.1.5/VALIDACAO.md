# Master Games Arcade 1.1.5 — validação HID real

## Correção aplicada
O launcher agora aguarda o estado neutro antes da captura, diferencia a transição de soltura e pressionamento, bloqueia o loop global do controle durante configuração e informa quais ações perderam um token duplicado.

## Testes executados
- JavaScript embutido do launcher: `node --check` aprovado.
- Backend `mame-server.js`: `node --check` aprovado.
- Electron `main.cjs`: `node --check` aprovado.
- Runtime isolado: controle simulado reconhecido, status atualizado, captura de ação executada, conflito removido, modal permaneceu aberto e nenhum jogo foi iniciado.
- Backend: binding capturado persistido e `updatedAt` alterado.
- Payload: launcher, backend, Electron, perfil e MAMEPlus 0.168.2 presentes.
- Instalador: PE32 NSIS Windows, aproximadamente 219 MB.
- ZIP: `zip -T` aprovado, aproximadamente 81 MB, contendo MAMEPlus 0.168.2.

## Limitação
A leitura HID física do DragonRise foi confirmada anteriormente no Windows pelo relatório enviado pelo usuário. A nova captura do launcher foi validada em runtime isolado; a confirmação final do segundo botão físico após a instalação deve ser feita no Windows do usuário.

## Artefatos
- EXE: Master Games Arcade Setup 1.1.5-complete.exe
- ZIP: MasterGamesArcade-sistema-completo-HID-MAMEPlus-1.1.5.zip
