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
- [ ] Pesquisar somente repositórios públicos externos ao repositório do usuário.
- [ ] Abrir e comparar configurações externas de MAME, DragonRise e encoders duplos.
- [ ] Entregar links e indicar o que é reaproveitável, incompatível ou apenas referência.


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
- [ ] Auditar o repositório `master-games-arcade-system` e o estado final do código.
- [ ] Sincronizar o código corrigido e gerar o ZIP completo atualizado sem EXE.
- [ ] Validar conteúdo, tamanho e ausência de executáveis antes do commit.
- [ ] Fazer commit e push para o GitHub e entregar o link.
