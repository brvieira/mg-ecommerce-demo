# 🛍️ MG Catalog Demo — MongoDB Atlas E-commerce Showcase

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)](https://expressjs.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![MUI](https://img.shields.io/badge/MUI-6-007FFF?logo=mui&logoColor=white)](https://mui.com)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![OpenAI](https://img.shields.io/badge/Embeddings-OpenAI-412991?logo=openai&logoColor=white)](https://platform.openai.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)

> Catálogo de e-commerce (vestuário e calçados) construído para demonstrar, com uma UI real e interativa, os principais recursos de busca e modelagem de dados do **MongoDB Atlas**.

---

## 📖 Descrição

Este projeto simula uma loja online completa — não é apenas uma vitrine estática, mas uma aplicação full-stack com busca, cadastro de produtos e simulação de compra — cujo verdadeiro objetivo é colocar em evidência, na prática, como o **MongoDB Atlas** resolve problemas reais de e-commerce:

- **Busca textual relevante** via **Atlas Search** (`$search`), com pré-filtros nativos por categoria, marca, cor e faixa de preço, e facets dinâmicos recalculados a cada consulta.
- **Busca semântica** via **Atlas Vector Search** (`$vectorSearch`), aplicada à feature "produtos semelhantes" na página de detalhe — a similaridade é por significado, não por palavra-chave, e pode inclusive cruzar categorias.
- **Schema flexível orientado a documentos**: cada produto guarda um objeto `attributes` livre cujas chaves variam por categoria (ex.: calçados têm `tipoSola`, vestuário tem `genero`) — e o formulário de edição permite adicionar novos atributos arbitrários a qualquer produto, sem qualquer migração de schema.
- **Escrita, não só leitura**: criação/edição de produtos com geração automática de embedding no momento da escrita, e uma simulação de compra que decrementa estoque de SKU e grava o pedido na collection `orders`, de forma atômica.
- **Transparência total do dado**: um painel de debug expõe o JSON bruto retornado pelo MongoDB (incluindo o vetor de `embedding`) em qualquer tela, e um painel de diagnóstico mostra o tempo de execução e o total de resultados de cada busca.

O grande diferencial do projeto é servir como **referência viva**: em vez de slides ou trechos de código isolados, cada recurso do Atlas pode ser visto, clicado e inspecionado funcionando dentro de um fluxo de e-commerce reconhecível. É um projeto de demonstração — não há autenticação, gateway de pagamento real, nem preocupação com escala além da necessária para ilustrar os recursos do Atlas.

## 🛠️ Tecnologias

| Camada | Tecnologia |
|---|---|
| **Backend** | Node.js + Express, driver nativo do MongoDB (sem ORM/ODM), arquitetura em camadas `routes → controllers → services → repositories` |
| **Frontend** | React 18 + Vite, Material UI (MUI) 6, React Router, Context API para estado de busca/filtros |
| **Banco de dados** | MongoDB Atlas — Atlas Search (full-text) e Atlas Vector Search (semântica) |
| **Embeddings** | OpenAI `text-embedding-3-small` (1536 dimensões) via `fetch` direto (sem SDK) |
| **Seed / dados sintéticos** | Script Node standalone: gera embeddings, popula ~100 produtos e ~20 mil pedidos históricos simulados |
| **Infraestrutura** | Docker Compose (backend + frontend), frontend servido em produção via Nginx com proxy de `/api` |

## ⚙️ Instalação

### Pré-requisitos

1. Um cluster **MongoDB Atlas** (tier com suporte a Atlas Search + Atlas Vector Search) e a respectiva connection string.
2. Uma **API key da OpenAI** com acesso ao endpoint de embeddings.
3. **Node.js 20+**, ou **Docker + Docker Compose** para rodar via container.

### 1. Configurar variáveis de ambiente

Há um único `.env` na raiz do repositório, compartilhado pelos três projetos:

```bash
cp .env.example .env
```

Preencha o `.env`:

```dotenv
# MongoDB Atlas
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster-host>/?retryWrites=true&w=majority
MONGODB_DB=catalog_demo

# OpenAI (embeddings)
OPENAI_API_KEY=sk-...
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_EMBEDDING_DIMENSIONS=1536

# Backend
PORT=5000
```

### 2. Popular o banco (seed)

Gera os embeddings dos 100 produtos do catálogo, insere os documentos no Atlas, cria os índices de busca (Atlas Search, Atlas Vector Search e os índices MQL de suporte a filtros) e popula a collection `orders` com ~20 mil pedidos históricos simulados dos últimos 90 dias.

```bash
cd seed
npm install
npm run seed
```

O script é idempotente (`deleteMany` + `insertMany` a cada execução) e aguarda os índices Atlas ficarem `queryable` antes de terminar. Se a criação automática do índice falhar (permissão insuficiente ou tier incompatível), ele imprime no console o JSON exato de cada índice para criação manual via **Atlas UI → Search → Create Search Index → JSON Editor**.

### 3. Subir a aplicação

**Opção A — Docker Compose** (build de produção, frontend servido por Nginx):

```bash
docker compose up
```

Acesse `http://localhost:8080` (o backend não é exposto diretamente — o Nginx faz proxy de `/api` para o container do backend).

**Opção B — modo desenvolvimento, sem Docker** (em dois terminais):

```bash
# Backend — http://localhost:5000
cd backend
npm install
npm run dev

# Frontend — http://localhost:5173 (proxy de /api para o backend, ver vite.config.js)
cd frontend
npm install
npm run dev
```

## 🚀 Uso

Com a aplicação no ar, alguns fluxos para explorar os recursos do Atlas:

**Busca textual (Atlas Search)** — digite um termo na barra de busca do header (ex. `tênis nike`) e combine com os filtros da barra lateral (categoria, marca, cor, preço). O painel de diagnóstico mostra o tempo de execução e o total de resultados da consulta `$search`.

**Produtos semelhantes (Atlas Vector Search)** — abra qualquer produto e role até "Produtos semelhantes": a lista é gerada por `$vectorSearch` a partir do embedding do próprio produto, podendo trazer itens de categorias diferentes quando a semântica é próxima.

**Painel de debug** — em qualquer tela de produto, abra o visualizador de JSON bruto para inspecionar o documento exatamente como ele está armazenado no MongoDB, inclusive o vetor de `embedding`.

**Cadastro/edição de produto (schema flexível)** — crie um produto novo ou edite um existente e adicione um atributo livre (ex. `voltagem: 110V`) que nenhum outro produto da categoria possui, sem qualquer migração — o objeto `attributes` aceita qualquer chave.

**Simulação de compra** — na página de detalhes, finalize uma "compra" de um SKU: o backend decrementa o estoque daquele SKU e grava um documento na collection `orders` de forma atômica.

Também é possível falar diretamente com a API REST, por exemplo:

```bash
# Busca textual com filtros
curl "http://localhost:5000/api/search?q=camisa+polo&brand=Lacoste&priceMax=300"

# Produtos semanticamente semelhantes a um produto
curl "http://localhost:5000/api/products/<productId>/similar"

# Simular uma compra
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"productId": "<productId>", "sku": "<skuCode>", "quantity": 1}'
```

## 🤝 Contribuindo

Este é um projeto de demonstração pessoal, mas contribuições, sugestões e correções são bem-vindas:

1. Faça um fork do repositório.
2. Crie uma branch descritiva a partir de `main` (`git checkout -b feature/minha-melhoria`).
3. Rode o serviço afetado localmente (`npm run dev` em `backend/` e/ou `frontend/`) e valide manualmente o fluxo alterado — ainda não há suíte de testes automatizados neste repositório.
4. Abra um Pull Request descrevendo o que mudou e por quê. Se a mudança alterar comportamento coberto por `docs/specs/SPEC_V2.md` ou introduzir uma divergência intencional em relação à spec, registre-a em `docs/DIVERGENCES.md`.

Issues também são uma ótima forma de contribuir: relate bugs, proponha novas formas de demonstrar recursos do Atlas, ou aponte inconsistências entre o código e a documentação (`CLAUDE.md`, `AGENTS.md`, `GENERAL.md`).

## 📄 Licença

Projeto de demonstração pessoal, sem afiliação com a MongoDB Inc. ou a OpenAI. Não há um arquivo `LICENSE` formal neste repositório — uso livre para fins de estudo, demonstração e aprendizado. Se você pretende reutilizar este código em outro contexto, considere adicionar uma licença explícita (ex. [MIT](https://choosealicense.com/licenses/mit/)).
