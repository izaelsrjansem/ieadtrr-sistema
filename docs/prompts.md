# Prompts Atualizados Do Projeto

Use estes prompts no Codex, um por vez, para continuar o projeto.

## 1. Base do projeto

```text
Crie ou continue um projeto web para a Igreja Evangélica Assembleia de Deus Tradicional no Estado de Roraima usando React, Vite, TypeScript, Tailwind CSS, Firebase Authentication, Firestore, Storage e Firebase Hosting. A interface deve estar em português do Brasil, responsiva, institucional, simples para membros idosos e organizada para administração da igreja.
```

## 2. Cadastro completo

```text
Implemente um cadastro nominal completo para visitante, membro ou convidado. O usuário deve informar nome completo, CPF, RG, data de nascimento, telefone, e-mail, congregação, endereço completo, foto, data de batismo, data de aceitação, carta de mudança, carta de recomendação e observações. Inclua consentimento LGPD. O cadastro deve ficar pendente até aprovação do administrador.
```

## 3. Cargos e funções

```text
No cadastro, permita informar se a pessoa possui cargo ou função ministerial. A lista deve conter pastor, presbítero, diácono, diaconisa, missionário, missionária, evangelista, cooperador, obreiro, secretário, tesoureiro, dirigente, professor de EBD, líder de jovens, líder de mulheres, líder de louvor e outra função com campo para especificar.
```

## 4. Dados institucionais

```text
Use os dados institucionais extraídos dos documentos locais da igreja: nome, CNPJ, endereço da sede, data de fundação, pastor presidente, logo e chave Pix. Mostre publicamente apenas informações apropriadas: identidade da igreja, endereço, CNPJ, Pix para ofertas, doutrina e princípios resumidos do estatuto.
```

## 5. Doutrina pública

```text
Crie uma página pública chamada Doutrina com um resumo claro do estatuto: identidade cristã, culto e ensino bíblico, comunhão, ação cristã, admissão de membros, participação dos membros, conduta, cooperação, dízimos e ofertas. Não copie o estatuto inteiro; apresente em linguagem resumida para visitantes e novos membros.
```

## 6. Página interna de fundadores

```text
Crie uma página interna, acessível apenas para membros logados, com a relação nominal dos membros fundadores ou relação histórica extraída da ata. Exiba apenas os nomes, sem CPF, RG ou dados pessoais. Inclua uma nota interna de que a secretaria deve revisar a lista antes da publicação definitiva.
```

## 7. Área do membro

```text
Crie o painel do membro com avisos internos, agenda, campanhas, missões, documentos, atualização dos próprios dados cadastrais e acesso à página interna de fundadores. O membro não pode ver dados administrativos sensíveis.
```

## 8. Área da diretoria

```text
Crie o painel da diretoria com escala dos cultos, pregadores, dirigentes, Santa Ceia, campanhas, eventos internos e relatórios básicos. Diretoria pode gerenciar escalas e eventos, mas não pode alterar administradores.
```

## 9. Administração

```text
Crie o painel administrativo com aprovação de cadastros, cadastro manual de membros, edição de usuários, alteração de perfis, cadastro de congregações, edição das informações públicas do site, upload de documentos e histórico de ações administrativas.
```

## 10. Segurança Firebase

```text
Crie regras de segurança para Firestore e Storage. Dados públicos podem ser lidos por todos. Dados internos exigem login. Dados administrativos exigem role admin. Diretoria pode gerenciar escalas e eventos internos. Usuários comuns só podem editar os próprios dados básicos. Documentos como foto, carta de mudança e carta de recomendação devem ter acesso restrito.
```

## 11. Revisão final

```text
Revise o projeto com foco em segurança, LGPD, responsividade, acessibilidade, clareza para usuários iniciantes, organização do código e separação correta entre área pública, área de membro, diretoria e administração. Corrija problemas encontrados e rode o build.
```
