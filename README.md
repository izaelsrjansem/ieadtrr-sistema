# Sistema da Igreja ADTRR

Site e sistema inicial para a Igreja Evangélica Assembleia de Deus Tradicional no Estado de Roraima.

## O que já existe

- Site público com início, congregações, agenda, doutrina, diretoria, cadastro e área restrita.
- Cadastro nominal para visitante, membro ou convidado.
- Campo de cargo/função ministerial com pastor, presbítero, diácono, diaconisa, missionário, missionária e outras funções.
- Campos de CPF, RG, endereço, telefone, foto, data de batismo, data de aceitação, carta de mudança e carta de recomendação.
- Página pública com doutrina e princípios resumidos do estatuto.
- Página interna com relação nominal histórica/fundadores para membros.
- Estrutura inicial para Firebase Authentication, Firestore, Storage e Hosting.

## Dados institucionais usados

Foram usados como fontes locais:

- `Carnê Pró Construção.doc`: logo, CNPJ, endereço, Pix e pastor presidente.
- `Ata e Estatudo da Igreja Assembleia de Deus Tradicional RR.pdf`: estatuto, princípios gerais e relação nominal histórica.

## Como rodar

No Codex desta máquina, use o Node interno:

```powershell
$env:PATH = "C:\Users\izael\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\izael\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin;$env:PATH"
pnpm install
pnpm dev
```

Quando instalar Node.js no Windows, os comandos normais serão:

```powershell
pnpm install
pnpm dev
```

## Firebase

Copie `.env.example` para `.env` e preencha:

```text
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Enquanto o Firebase não estiver configurado, o formulário salva uma simulação local no navegador para testes.

## Próximas etapas

1. Criar o projeto no Firebase e preencher o `.env`.
2. Ativar Authentication por e-mail e senha no console.
3. Criar Firestore e Storage e publicar as regras de segurança.
4. Aprovação de cadastros pelo admin (promover perfil de pendente para membro/diretoria).
5. Transformar os dados demonstrativos em dados lidos do Firestore.

O login/criação de acesso e o controle de perfis (pendente, membro, diretoria, admin) já estão implementados no código; falta apenas o projeto Firebase real para funcionar de ponta a ponta.
