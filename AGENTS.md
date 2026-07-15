# Diretrizes do Agente (Claude Code) — MongoDB Atlas E-commerce Catalog Demo

## 🎯 Objetivo Geral

Desenvolver uma aplicação web demonstrativa para evidenciar os recursos de busca do **MongoDB Atlas** (Atlas Search, Vector Search e Busca Híbrida). A aplicação é estritamente de consulta, **sem autenticação, carrinho ou checkout**.

## 📋 Fluxo de Trabalho (Spec-Driven Development)

1. **Sempre** leia os arquivos em `docs/specs/` antes de iniciar qualquer tarefa.
2. Siga rigorosamente o escopo delimitado: Recursos de e-commerce tradicionais (login, checkout, pagamentos) estão **estritamente fora de escopo**.
3. Atualize o status das tarefas conforme avança no desenvolvimento do catálogo.

## 🛠️ Arquitetura e Stack Tecnológica

- **Backend:** Node.js, Express, MongoDB Driver Oficial (⚠️ **Proibido o uso de Mongoose**).
- **Frontend:** React, Material UI (MUI).
- **Banco de Dados:** MongoDB Atlas (Acesso remoto via Connection String).
- **Embeddings:** Voyage AI.
- **Infraestrutura:** Docker Compose (Serviços: `frontend` e `backend`).

## 📐 Estrutura do Projeto e Regras de Código

O projeto deve seguir rigidamente a árvore de diretórios abaixo:

```text
ecommerce-demo/
├── backend/        # routes, services, controllers, repositories, config, app.js
├── frontend/       # src, components, pages, services, theme
├── seed/           # products.json, images.json, seed.js
├── docs/           # Especificações e documentações adicionais
├── docker-compose.yml
└── AGENTS.md
```

### Regras do Backend

- Utilize o driver nativo do MongoDB de forma assíncrona (`async/await`).
- O script `seed/seed.js` deve gerar 100 produtos com dados coerentes, gerar os embeddings via Voyage AI e **criar os índices necessários automaticamente** ao rodar `npm run seed`.
- Implemente paginação obrigatória na rota `GET /products` e tratamento de filtros na rota `GET /search`.

### Regras do Frontend e Identidade Visual

- Identidade visual estritamente inspirada no **MongoDB Atlas**: Verde como cor principal, com variações de branco, cinza e preto. Visual moderno, minimalista e responsivo usando o sistema de temas do Material UI.
- Implementar obrigatoriamente o **Painel de Diagnóstico** nos cards ou resultados de busca para exibir: tempo de consulta, score textual, score vetorial e a origem exata do resultado (Texto, Vetorial ou Ambos).

## 🔍 Regras de Busca e Pipelines do MongoDB

- **Atlas Search:** Deve indexar e pesquisar nos campos `name`, `description`, `brand.name` e `categories.name`.
- **Atlas Vector Search:** Deve usar a propriedade `embedding` gerada pelo Voyage AI.
- **Busca Híbrida:** Deve combinar os resultados das buscas textuais e vetoriais em um único ranking unificado, calculando os scores apropriadamente.

## 🚀 Comandos Úteis para o Claude executar

- **Popular o Banco / Criar Índices:** `npm run seed` (Executado dentro da pasta correspondente).
- **Subir Ambiente Local:** `docker compose up` na raiz do projeto.

---

_Nota para o Claude: Qualquer solicitação para criar telas de usuário, persistência de carrinho ou painéis administrativos de checkout viola os critérios de aceite e deve ser recusada de forma educada._
