## Objetivo

Corrigir o arquivo `COMO-USAR.txt` (e adicionar um `LEIA-ME.txt` dentro do ZIP do Windows) explicando **exatamente onde colocar o MAME e as ROMs**, já que o sistema é offline e o usuário precisa saber a estrutura de pastas.

## O que será adicionado nas instruções

### 1. Estrutura recomendada de pastas
```
C:\MasterGamesArcade\
├── win-unpacked\           ← onde fica o Master Games Arcade.exe
├── MAME\
│   ├── mame.exe            ← baixe em https://www.mamedev.org/release.html
│   ├── roms\               ← coloque os .zip das ROMs aqui
│   ├── snap\               ← (opcional) screenshots
│   ├── artwork\            ← (opcional) artes de gabinete
│   └── cfg\                ← criado automaticamente pelo MAME
└── (pode renomear como quiser)
```

### 2. Passo a passo dentro do app
1. Abrir `Master Games Arcade.exe`
2. Clicar em **CONFIG** (canto superior direito)
3. **Caminho do MAME**: clicar em **PROCURAR** → navegar até `mame.exe`
4. **Pasta de ROMs**: clicar em **PROCURAR** → selecionar a pasta `roms\`
5. Clicar em **🔧 TESTAR MAME** para validar (deve retornar ✅ exit code 0)
6. Clicar em **SALVAR**
7. As ROMs aparecem automaticamente na lista da direita

### 3. Onde baixar o MAME
- Oficial: https://www.mamedev.org/release.html
- Baixar o **MAME 64-bit binaries** (zip) → extrair → o `mame.exe` está dentro

### 4. Formato das ROMs
- Devem ser arquivos `.zip` (não extrair!)
- O nome do arquivo é o nome interno do jogo (ex: `sf2.zip`, `1942.zip`, `mslug.zip`)
- ROMs precisam ser da **mesma versão** do MAME que você baixou (senão dá erro de checksum)
- Algumas ROMs precisam de **BIOS** (ex: `neogeo.zip` para jogos Neo-Geo) — coloque junto na pasta `roms\`

### 5. Solução de problemas
- "ROM not found" → verifique se o `.zip` está na pasta correta e o nome bate
- "Missing files" → versão do MAME ≠ versão da ROM. Baixe ROMs compatíveis
- Tela preta ao lançar → clique em TESTAR MAME para ver o erro real
- Para jogos Neo-Geo → precisa de `neogeo.zip` (BIOS) na pasta de ROMs

### 6. Para a versão SOURCE (compilação própria)
Adicionar passos sobre instalar `electron-builder` como devDependency caso não esteja no `package.json`, e nota de que o `.exe` final estará em `release\Master Games Arcade Setup 1.0.0.exe`.

## Arquivos afetados
- `/mnt/documents/COMO-USAR.txt` — reescrito com seções acima
- `/mnt/documents/Master-Games-Arcade-Windows-x64.zip` — adicionar `LEIA-ME.txt` dentro (mesmo conteúdo resumido) para o usuário ver ao extrair

**Nenhuma alteração no código do app** — somente documentação.
