# 🏆 REGRA DE OURO — Master Games Arcade (MGA)

Estas regras são fixas e inegociáveis. Sempre devem ser respeitadas em qualquer versão do sistema, independente de refatorações, updates ou reconstruções feitas no Lovable.

## 1. Intro
O sistema sempre deve ter a tela de intro (abertura) antes de carregar o launcher principal.

## 2. Imagens de fundo
O sistema sempre deve ter as imagens das mulheres como parte do fundo/tema visual.

## 3. Download dos emuladores MAME
O sistema sempre deve baixar **um único MAME**: o `mamep64.exe` oficial do Emerson (MAME Plus 64), diretamente do **Google Drive**.
Fonte original: `https://drive.google.com/drive/folders/1t562Vw2DhjlMhXvaQ3iYR5BY0VWaz87N`

## 4. Download das ROMs
O sistema sempre deve baixar as ROMs a partir deste link fixo do Google Drive:
`https://drive.google.com/drive/folders/1E2wJxUnCMkzlEwJ13-WS_G4Su-qA6H2A` (180 ROMs)

- As ROMs sempre devem ser salvas em uma pasta interna dentro da própria pasta de instalação (`[PastaDeInstalação]/MAME/roms/`).
- O MAME sempre deve apontar para essa mesma pasta interna de ROMs (via `mame.ini` gerado pelo instalador).

## 5. Janela de instalação
- Janela de instalação personalizada.
- Ao clicar no .ico/.exe deve abrir mostrando recortes/trechos das imagens de fundo.
- Deve exibir informações do sistema (nome, versão, descrição).
- Deve exibir: **Dev Emerson 2026**.

## 6. Correção de erros — Lovable nunca recria do zero
Em caso de erro, o Lovable jamais deve criar sistema novo do zero. Sempre ajustar/corrigir o sistema existente preservando toda a estrutura, funcionalidades e regras já implementadas.

## 7. Ordem de download no instalador
Sequência: primeiro MAMEs, depois ROMs. Antes de baixar MAMEs, verificar se já existem:
- Se já instalados → pula e baixa só as ROMs.
- Se não existirem → baixa MAMEs primeiro, depois ROMs.

## 8. Tecnologia e plataforma
- **Electron**.
- Alvo exclusivo: **Windows**.
- Instalador gerado com **NSIS** via electron-builder (target `nsis`), gerando `.exe`.

## 9. Nome do sistema
Sempre **Master Games Arcade**.

## 10. Tela cheia adaptável
Abrir em tela cheia, adaptando à resolução do monitor sem cortes/distorções/barras.

## 11. Correção isolada — não quebrar outras partes
Alterar apenas o trecho diretamente relacionado ao problema.

## 12. Preservar funcionalidades existentes
Nenhuma correção pode remover/desativar/alterar comportamento de funcionalidades já em uso (intro, imagens, MAMEs/ROMs, instalador, tela cheia, etc.).

## 13. Testar dependências antes de alterar
Verificar quais outras partes dependem do componente antes de modificar.

## 14. Nunca reescrever arquivos inteiros por um erro pontual
Corrigir apenas o ponto do erro; jamais reescrever o arquivo/módulo completo por um problema pontual.

## 15. Validação pós-correção
Confirmar que as regras 1–10 continuam sendo cumpridas antes de finalizar qualquer ajuste.

## 16. Distribuição do instalador via CDN
O instalador `.exe` sempre é distribuído via **CDN da Lovable**. O MAME e as ROMs são baixados diretamente do Google Drive durante a instalação.

## 17. Sem uso de arquivos .bat
O sistema **jamais** deve usar `.bat` para build, instalação ou qualquer etapa. O `.exe` completo é gerado direto (Electron + NSIS + CDN), sem scripts intermediários.

