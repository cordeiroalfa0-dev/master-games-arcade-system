# TODO — Master Games Arcade System

## Auditoria e correção dos controles

- [x] Auditar `dist/launcher.html`, `mame-server.js`, `controls-profile.json`, `ctrlr/master-games-arcade.cfg` e `mame.ini`.
- [x] Tornar `padKey` único por índice quando dois encoders compartilham o mesmo ID do navegador.
- [x] Separar `padMap` do navegador de `deviceMap` e `joycodeMap` do MAME.
- [x] Adicionar geração de captura para interromper loops antigos de polling.
- [x] Corrigir `joyIndexFor` e captura de botões/eixos, incluindo P2_BUTTON3.
- [x] Gerar `mapdevice` somente para IDs reais e distintos fornecidos pelo diagnóstico do MAME.
- [x] Validar XML, perfil, launcher e testes de um/dois controles sem gerar EXE.
- [x] Documentar o resultado e os bloqueios restantes antes de qualquer empacotamento.


## Testes visuais dos controles
- [x] Criar diagnóstico visual isolado do sistema com pads, índices, `padKey`, jogador e `JOYCODE`.
- [x] Mostrar em tempo real captura de botão/eixo, geração da captura, sequência final e conflitos.
- [x] Capturar evidências visuais dos cenários de um controle e dois encoders idênticos.


## Pesquisa externa de configurações
- [x] Pesquisar somente repositórios públicos externos ao repositório do usuário.
- [x] Abrir e comparar configurações externas de MAME, DragonRise e encoders duplos.
- [x] Entregar links e indicar o que é reaproveitável, incompatível ou apenas referência.


## Pesquisa exclusiva: interação MAME-controles
- [x] Pesquisar enumeração, JOYCODE, HATs, eixos, `ctrlr` e `mapdevice` em fontes externas.
- [x] Comparar dois gamepads, dois encoders idênticos e encoder compartilhado.
- [x] Documentar implicações técnicas para o sistema sem gerar EXE.


## Correção autorizada do sistema
- [x] Auditar o estado atual do código do sistema antes das correções.
- [x] Corrigir identidade de pads idênticos, captura concorrente, P1/P2 e geração do CFG/MAME.
- [x] Criar e executar testes visuais e técnicos, incluindo `P2_BUTTON3`.
- [x] Validar persistência, XML e `mapdevice` sem gerar EXE.


## Instalação de teste e seis controles simulados
- [x] Preparar uma cópia isolada do sistema para execução local.
- [x] Simular DragonRise/arcade, PlayStation, Xbox/XInput, DirectInput genérico, encoder compartilhado e dois encoders idênticos.
- [x] Mostrar visualmente detecção, P1/P2, botões, eixos, HATs, conflitos e JOYCODE de cada perfil.
- [x] Executar testes técnicos e documentar limitações do ambiente sem gerar EXE.


## Instalação real a partir do ZIP corrigido
- [x] Extrair o ZIP corrigido em uma pasta limpa de instalação.
- [x] Instalar as bibliotecas/dependências do sistema a partir do manifesto do ZIP.
- [x] Executar o backend e o launcher reais da instalação limpa.
- [x] Mostrar visualmente o painel real de controles e o comportamento dos perfis.
- [x] Documentar falhas e evidências sem gerar EXE.


## Correção encontrada na instalação real
- [x] Corrigir fallback inicial do perfil manual para abrir visualmente o modal de controles.
- [x] Recriar o ZIP completo corrigido, reinstalar dependências e repetir a captura do launcher/painel.


## Seis controles no painel real
- [x] Injetar seis gamepads virtuais no Electron instalado a partir do ZIP.
- [x] Abrir o painel real e mostrar os seis dispositivos na detecção/seleção.
- [x] Validar P1/P2, índices, IDs, eixos, HATs, conflitos e captura no painel real.
- [x] Registrar evidências visuais sem gerar EXE.


## Aceitação direta pelo MAME
- [x] Confirmar versão e arquitetura do binário MAMEPlus 0.168.2 disponível.
- [x] Executar o MAME com `-verbose` usando um perfil temporário de controles.
- [x] Verificar carregamento de `ctrlr`, `mapdevice`, HATs, eixos e sequências P1/P2.
- [x] Documentar claramente aceitação, avisos e limitações sem gerar EXE.


## Teste KOF 2000 + BIOS Neo Geo
- [ ] Copiar `kof2000.zip` e `neogeo.zip` para uma área temporária de ROMs.
- [ ] Validar hashes, nomes e reconhecimento da BIOS/ROM pelo MAMEPlus 0.168.2.
- [ ] Executar KOF 2000 com `-verbose` e capturar a tela/erros de inicialização.
- [ ] Testar vídeo, áudio, controles P1/P2 e configuração durante o jogo.
- [ ] Documentar o resultado sem gerar EXE.


## Seis controles dentro do KOF 2000
- [ ] Executar KOF 2000 com a ROM e BIOS enviadas em sessão de teste dedicada.
- [ ] Aplicar eventos de entrada dos seis controles no jogo real.
- [ ] Capturar visualmente a tela do jogo e o registro dos eventos P1/P2.
- [ ] Documentar o que foi realmente aceito pelo MAME e as limitações do ambiente.


## Vídeo visual do jogo com controles
- [x] Preparar captura da janela real do KOF 2000 em execução.
- [x] Criar monitor visual com perfil, jogador, ação, tecla equivalente e timestamp.
- [x] Aplicar eventos dos seis perfis enquanto o jogo roda e salvar a evidência.
- [x] Documentar que os eventos são virtuais, pois não há hardware físico conectado.


## Fluxo exato solicitado: instalação + jogo + controles
- [x] Reinstalar a cópia limpa a partir do ZIP completo atualizado.
- [x] Confirmar KOF 2000 e BIOS Neo Geo nessa instalação.
- [x] Executar o jogo real e enviar os controles dentro da janela do MAME.
- [x] Gravar a tela do jogo com os eventos de controle identificados.


## Fluxo visual launcher → ROM → movimentos
- [ ] Reinstalar e abrir o launcher real a partir do ZIP atualizado.
- [ ] Selecionar `kof2000` pelo fluxo da biblioteca do launcher.
- [ ] Deixar o KOF 2000 rodando e aplicar cima, baixo, esquerda, direita, start, crédito e botões.
- [ ] Gravar a tela do fluxo completo e registrar que as entradas são virtuais neste ambiente.


## Seis testes de controle com ações no KOF 2000
- [ ] Abrir o launcher real e selecionar `kof2000`.
- [ ] Preparar seis sequências, uma para DragonRise, PlayStation, Xbox, DirectInput, encoder compartilhado e DragonRise idêntico.
- [ ] Aplicar movimento, ataque e tentativa de super em cada perfil dentro do jogo.
- [ ] Capturar vídeo/quadros do jogo acontecendo com a legenda do teste ativo.
- [ ] Documentar que os eventos são virtuais neste ambiente e não gerar EXE.


## Defeitos encontrados no lançamento real pelo launcher
- [ ] Corrigir a referência indefinida `JOYSTICK_ARGS` na rota de lançamento do backend.
- [ ] Garantir que o executável MAME tenha permissão de execução na instalação de teste Linux, sem alterar o pacote Windows.
- [ ] Repetir seleção de `kof2000` pelo launcher e confirmar o jogo iniciado pelo botão real.


## Repetição obrigatória da captura do jogo
- [ ] Verificar se o vídeo anterior foi criado e se contém a janela do KOF.
- [ ] Reiniciar o KOF em tela dedicada se necessário.
- [ ] Gravar novamente os seis testes com o jogo visível.
- [ ] Entregar o vídeo e quadros reais, sem confundir com a tela do launcher.


## Prova visual obrigatória do jogo e controles
- [x] Diagnosticar por que a gravação foi interrompida antes de gerar o vídeo.
- [x] Manter o KOF visível no display dedicado durante toda a captura.
- [x] Reexecutar seis testes com movimentos, ataques e tentativas de super.
- [x] Verificar quadros do vídeo e entregar a gravação real do jogo.


## Atualização do GitHub
- [x] Auditar o repositório `master-games-arcade-system` e o estado final do código.
- [x] Sincronizar o código corrigido e gerar o ZIP completo atualizado sem EXE.
- [x] Validar conteúdo, tamanho e ausência de executáveis antes do commit.
- [x] Fazer commit e push para o GitHub e entregar o link.


## Geração autorizada do EXE a partir do GitHub
- [x] Baixar o ZIP corrigido diretamente do GitHub e extrair em pasta limpa.
- [x] Instalar dependências do ZIP e executar os testes técnicos antes do empacotamento.
- [x] Gerar o instalador EXE com a configuração NSIS do sistema.
- [x] Validar existência, tamanho, assinatura estrutural e conteúdo do EXE.
- [x] Entregar o EXE e o ZIP usado como origem.


## Pacote completo com MAMEPlus 0.168.2
- [x] Localizar e validar o binário MAMEPlus 0.168.2 e arquivos auxiliares.
- [x] Copiar MAME, `mame.ini`, `ctrlr`, plugins e recursos necessários para o pacote.
- [x] Atualizar o ZIP completo no repositório GitHub.
- [x] Gerar novo instalador NSIS incluindo `emulators/mame168`.
- [x] Validar que o EXE contém o MAME e entregar o EXE/ZIP completos.


## Conflito real exibido no Windows
- [x] Auditar por que `JOYCODE_1_BUTTON1`/`BUTTON7` aparecem simultaneamente em ações de jogo e interface.
- [x] Corrigir o preset padrão para separar controles de jogo dos comandos UI ou definir uma regra explícita sem falso positivo.
- [x] Testar o painel real com o preset DragonRise e confirmar zero conflitos indevidos.
- [x] Atualizar GitHub, ZIP e EXE somente após a validação visual corrigida.


## Captura reintroduzindo conflitos no painel
- [x] Rastrear por que o perfil DragonRise carregado ainda contém UI_SELECT/UI_CANCEL com tokens físicos antigos.
- [x] Corrigir a captura para remover o token de qualquer ação anterior antes de atribuí-lo à nova ação.
- [x] Garantir que a captura não deixe o mesmo JOYCODE em duas ações de gameplay.
- [x] Limpar/normalizar o perfil persistido antes de carregar e salvar.
- [x] Reproduzir a captura no painel real e gerar novo ZIP/EXE somente após zero conflitos.


## Auditoria de conflitos em todos os controles
- [ ] Auditar Universal/Auto, DragonRise, DirectInput e PlayStation/XInput.
- [ ] Comparar tokens repetidos entre UI, P1, P2, Start/Coin, eixos e HATs.
- [ ] Verificar o perfil persistido e os arquivos XML distribuídos.
- [ ] Corrigir apenas conflitos reais encontrados e documentar o resultado.


## Pesquisa WinKawaks versus MAME
- [x] Pesquisar como WinKawaks enumera e grava controles DragonRise.
- [x] Comparar WinKawaks, MAMEPlus 0.168.2 e o perfil atual.
- [x] Identificar ajustes reaproveitáveis sem alterar o sistema antes da validação.
- [x] Documentar fontes, limitações e recomendação técnica.


## Aprendizado aplicado: WinKawaks para MAME
- [x] Mapear a sequência real de captura e salvamento do WinKawaks.
- [x] Pesquisar como o MAME 0.168 trata a mesma sequência e os mesmos dispositivos.
- [x] Derivar melhorias concretas para o launcher sem copiar formatos incompatíveis.
- [x] Documentar o que será aplicado e como validar no jogo.


## Roadmap de melhorias do sistema
- [ ] Criar mapa lógico intermediário por jogador: direções, b1–b6, Start e Coin.
- [ ] Adicionar assistente de captura sequencial inspirado no WinKawaks.
- [ ] Adicionar teste de entrada com matriz P1/P2 e diagnóstico de IDs.
- [ ] Melhorar o tratamento de dois encoders DragonRise idênticos.
- [ ] Criar perfis por família de jogos sem duplicar bindings.
- [ ] Validar e aplicar melhorias somente após teste real no MAMEPlus 0.168.2.


## Melhorias autorizadas e reinício inesperado
- [x] Identificar o evento que reinicia o launcher ao selecionar perfil, ação ou botão.
- [x] Garantir que selecionar/capturar não reinicie o launcher nem o MAME.
- [x] Implementar mapa lógico e assistente sequencial inspirado no WinKawaks.
- [x] Adicionar diagnóstico de P1/P2, IDs, eixos, HATs e tokens.
- [x] Validar todos os cliques, captura, salvamento e execução do MAME antes de gerar EXE/ZIP.


## Entrega NSIS completa após melhorias
- [x] Corrigir a etapa Wine/NSIS que deixou o instalador incompleto.
- [x] Gerar EXE NSIS com o payload completo, incluindo MAMEPlus 0.168.2.
- [x] Validar que o EXE contém launcher, backend, perfis, captura guiada, ctrlr e MAME.
- [x] Recriar ZIP completo e atualizar o Release sem substituir o instalador pelo Portable.


## Pesquisa GitHub: bibliotecas de controles
- [x] Localizar 10 bibliotecas/projetos reais para gamepad, DirectInput/XInput e mapeamento.
- [x] Verificar documentação, manutenção, licença e compatibilidade com Electron/Windows.
- [x] Avaliar relação com MAME 0.168.2 e DragonRise 0079:0006.
- [x] Produzir ranking de aplicabilidade sem instalar nada ainda.


## Perfil confirmado: um único encoder DragonRise
- [x] Configurar o DragonRise 0079:0006 como P1 único.
- [x] Deixar P2 desativado/automático e sem interferência no perfil principal.
- [x] Remover `mapdevice` do caminho padrão de um único encoder.
- [x] Validar captura, UI, salvamento e MAME com o cenário de um controle.
- [x] Reconstruir e atualizar EXE/ZIP completos após a validação.


## Pesquisa GitHub: somente casos comprovados
- [x] Definir evidência mínima de funcionamento para aceitar um caso.
- [x] Verificar issues, releases, testes ou configurações reproduzíveis.
- [x] Excluir sugestões sem validação pública e projetos incompatíveis.
- [x] Comparar as soluções comprovadas com um único DragonRise no MAME.


## Pesquisa e integração ampliada de bibliotecas
- [x] Catalogar pelo menos 10 bibliotecas/projetos GitHub com evidência de funcionamento.
- [x] Verificar licença, manutenção, compatibilidade Windows/Electron e relação com MAME.
- [x] Selecionar componentes que realmente ajudem DragonRise, DirectInput, XInput e SDL.
- [x] Integrar somente bibliotecas aprovadas após teste de não regressão.
- [x] Testar todos os perfis e reconstruir EXE/ZIP após validação.


## Nova pesquisa: casos públicos resolvidos no MAME/DragonRise
- [x] Identificar pessoas, projetos ou comunidades que resolveram problemas equivalentes de controles no MAME.
- [x] Verificar as fontes originais e distinguir solução comprovada de sugestão.
- [x] Comparar os métodos encontrados com o sistema Master Games Arcade.
- [x] Entregar referências, limites e recomendação técnica sem alterar o código.


## Atualização baseada na pesquisa MAME/DragonRise
- [ ] Reforçar o diagnóstico com identificação explícita do MAME, provider, device ID e tokens do `-verbose`.
- [ ] Adicionar recuperação segura para configurações antigas, sem apagar dados automaticamente.
- [ ] Impedir geração de `mapdevice` com VID/PID genérico ou IDs duplicados.
- [ ] Exibir no assistente quando a configuração exigir remapeamento limpo após uma alteração.
- [ ] Validar captura, conflitos, XML, diagnóstico e lançamento antes de gerar EXE/ZIP.
- [ ] Gerar e publicar o EXE/ZIP atualizado somente após todos os testes passarem.


## Correção solicitada: persistência dos controles ao desligar
- [x] Auditar onde o perfil é salvo e como o launcher encerra.
- [x] Salvar o perfil imediatamente após captura, seleção e alterações manuais relevantes.
- [x] Fazer uma última gravação segura no fechamento sem depender apenas de `beforeunload`.
- [x] Reabrir o launcher e confirmar que bindings, mapa lógico e CFG do MAME permanecem iguais.
- [x] Gerar EXE/ZIP atualizado somente após a validação de persistência.


## Melhoria visual solicitada: área de controles
- [x] Auditar o HTML/CSS atual do painel de controles.
- [x] Melhorar hierarquia visual, estados, agrupamento, legibilidade e responsividade sem alterar a lógica.
- [x] Validar captura guiada, autosave, seleção de perfil e diagnóstico após a mudança visual.
- [x] Gerar EXE completo e ZIP atualizado com a melhoria visual.


## Validação solicitada antes de gerar novo EXE
- [x] Executar o launcher visual em ambiente isolado sem gerar instalador.
- [x] Testar abertura do painel, agrupamentos, seleção de perfil e P1/P2.
- [x] Testar captura guiada com eventos simulados e prevenção de conflitos.
- [x] Testar autosave, fechamento, reabertura e reaplicação ao MAME.
- [x] Gerar novo EXE apenas se todos os testes práticos passarem.


## Falha encontrada no teste prático
- [x] Atualizar o badge de status imediatamente após `DETECTAR CONTROLES`, pois hoje a atribuição funciona mas o status visual não acompanha.
- [x] Repetir a detecção, captura e persistência após a correção antes de gerar o EXE.


## Aprovação manual obrigatória antes de novo EXE
- [ ] Abrir o sistema de teste na tela, sem gerar instalador.
- [ ] Mostrar o painel de controles, detecção, monitor e captura para inspeção do usuário.
- [ ] Aguardar aprovação explícita do usuário.
- [ ] Não gerar novo EXE nem alterar o Release antes da aprovação.


## Simplificação da tela de configuração
- [ ] Remover tokens e nomes técnicos da área visível de controles.
- [ ] Substituir perfis e diagnósticos por nomes compreensíveis para o usuário.
- [ ] Manter os valores técnicos somente no funcionamento interno e nos arquivos do MAME.
- [ ] Abrir a nova tela para aprovação visual sem gerar EXE.


## ZIP completo do sistema com linguagem simples
- [x] Montar somente o ZIP do sistema, excluindo a landing page e saídas de build antigas.
- [x] Confirmar no ZIP o launcher atualizado, backend, Electron, perfil e MAMEPlus 0.168.2.
- [x] Testar a integridade do ZIP e publicar a atualização no Release do sistema.
- [x] Entregar somente o ZIP; não gerar EXE nesta etapa.


## EXE a partir do ZIP v1.1.4
- [x] Extrair e usar o ZIP v1.1.4 como fonte única do instalador.
- [x] Montar o payload Windows completo com launcher, MAMEPlus e configurações.
- [x] Compilar o instalador NSIS sem substituir os arquivos do sistema.
- [x] Validar PE, tamanho, integridade e componentes internos do EXE.
- [x] Entregar o EXE correspondente ao ZIP v1.1.4.


## Diagnóstico físico do controle e botão que abre outro jogo
- [x] Criar BAT Windows que peça cada botão/direção e registre os eventos detectados.
- [x] Incluir identificação do controle, número de botões, eixos, índice e relatório de conflitos.
- [x] Auditar por que o segundo botão da esquerda não é capturado corretamente.
- [x] Auditar por que esse botão abre outro jogo em vez de manter o jogo selecionado.
- [x] Entregar o BAT sem gerar EXE nesta etapa.


## Correção encontrada no diagnóstico do botão
- [x] Bloquear os atalhos globais do controle enquanto qualquer janela de configuração estiver aberta.
- [x] Impedir que o botão físico acione `launch()` durante captura ou configuração.
- [x] Revalidar que o botão problemático não abre outro jogo quando a configuração está aberta.


## Correção do BAT sem auxiliar separado
- [x] Criar uma pasta/pacote único contendo o BAT e o auxiliar necessário.
- [x] Fazer o BAT verificar a presença do auxiliar antes de iniciar.
- [x] Mostrar uma mensagem clara se o usuário abrir apenas o BAT fora do pacote.
- [x] Validar o fluxo de descoberta e entregar o pacote sem gerar EXE.


## Falha do diagnóstico por joystick e nova leitura HID
- [x] Substituir a leitura `joyGetPosEx` por leitura HID/Raw Input compatível com DragonRise.
- [x] Enumerar VID/PID, caminho, uso HID e relatórios recebidos.
- [x] Solicitar o segundo botão e registrar exatamente o relatório bruto recebido.
- [x] Validar o novo diagnóstico antes de entregar e não gerar EXE.


## Correção de caminho do diagnóstico HID
- [x] Fazer o BAT procurar `node.exe` recursivamente a partir da própria pasta.
- [x] Procurar também o script HID e validar que ambos pertencem ao mesmo pacote.
- [x] Recriar e validar o ZIP corrigido sem gerar EXE.


## Correção do erro 9009 no BAT HID
- [x] Validar que o caminho encontrado termina em `node-v22.13.0-win-x64\\node.exe`.
- [x] Evitar selecionar `node.exe` incorreto ou caminho relativo quebrado.
- [x] Executar o Node com chamada segura e validar o pacote novamente sem gerar EXE.


## Correção definitiva do erro 9009
- [x] Auditar e remover ambiguidade entre BAT antigo e BAT HID novo.
- [x] Entregar uma pasta com caminho fixo `runtime\\node.exe` e `app\\mga-control-diagnostic.js`.
- [x] Fazer o BAT mostrar o caminho encontrado antes de executar.
- [x] Validar o ZIP e orientar a exclusão da pasta antiga antes do teste.


## Captura HID sem ENTER
- [x] Remover a exigência de pressionar ENTER antes de cada direção ou botão.
- [x] Mostrar “pressione agora” e capturar automaticamente a próxima mudança HID.
- [x] Revalidar especificamente o segundo botão da esquerda sem gerar EXE.


## Correção baseada no relatório HID real
- [x] Interpretar o segundo botão pelo relatório HID completo, não apenas como botão comum.
- [x] Diferenciar pressionamento e soltura e ignorar o estado inicial.
- [x] Evitar que o evento do controle acione abertura de outro jogo.
- [x] Sinalizar e impedir gravação de bindings com conflito Botão 4/Botão 5 ou direções indistintas.
- [x] Validar novamente e só então gerar EXE e ZIP do sistema.


## Atualização solicitada: validação MAME 0.168 e pacote Windows
- [x] Confirmar no código-fonte do MAME 0.168 se `mapdevice` existe e é aceito.
- [x] Remover a geração de `mapdevice` se a diretiva não existir na versão 0.168.
- [x] Estender a captura para eixos adicionais e HATs.
- [x] Executar `node --check` e `tests/control-mapping.test.mjs` após as alterações.
- [x] Gerar pacote Windows com `@electron/packager --platform=win32`.
- [x] Criar ZIP completo e validar seu conteúdo. O mount `/mnt/documents` estava indisponível para escrita nesta sessão; o arquivo foi criado em `/home/ubuntu/final-mga-artifacts` e anexado ao Release.
- [x] Atualizar o Release do GitHub com o EXE e ZIP finais.
- [x] Aplicar a pesquisa atual: eliminar `mapdevice` do fluxo MAME 0.168.2, normalizar eixos/HAT e validar perfis DragonRise sem conflitos.
