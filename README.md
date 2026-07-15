# MongoDB Atlas E-commerce Catalog Demo

> Aplicação de referência para demonstrar, na prática, as principais capacidades de busca e modelagem de dados do **MongoDB Atlas** — Atlas Search, Atlas Vector Search e schema flexível — em um catálogo de e-commerce completo.

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)

---

## Sobre o projeto

Este projeto simula uma loja online (vestuário e calçados) para colocar em evidência, com uma UI real e interativa, como o MongoDB Atlas resolve problemas comuns de e-commerce:

- **Busca textual relevante** com Atlas Search (`$search`), incluindo pré-filtros por categoria, marca, cor e preço.
- **Busca semântica** com Atlas Vector Search (`$vectorSearch`), usada na feature de "produtos semelhantes" da página de detalhe do produto, a partir de embeddings gerados via OpenAI.
- **Schema flexível orientado a documentos**: cada produto guarda um objeto `attributes` livre, cujas chaves variam por categoria (ex.: calçados têm `tipoSola`, vestuário tem `genero`), sem exigir migração de schema.
- **Escrita e leitura no mesmo modelo**: criação/edição de produtos (com geração de embedding no momento da escrita) e uma simulação de compra que decrementa estoque atomicamente e grava pedidos em uma coleção `orders`.
- **Observabilidade da busca**: um painel de diagnóstico exibe, para cada consulta, o tempo de execução, o total de resultados e os facets dinâmicos calculados por filtro.

Este é um projeto de demonstração — não há autenticação, pagamento real ou preocupação com escala além do necessário para ilustrar os recursos do Atlas.

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Node.js + Express + driver nativo do MongoDB (sem ORM/ODM) |
| Frontend | React + Vite + Material UI |
| Banco de dados | MongoDB Atlas (Atlas Search + Atlas Vector Search) |
| Embeddings | OpenAI `text-embedding-3-small` |
| Infraestrutura | Docker Compose (`backend` + `frontend`, frontend servido via Nginx) |

## Arquitetura

```
backend/   API REST em camadas: routes → controllers → services → repositories
frontend/  SPA React (Vite), estado de busca centralizado em Context API
seed/      Script único: gera embeddings, popula o Atlas e cria os índices de busca
```

Cada diretório é um projeto Node independente, com seu próprio `package.json`. Não há workspace/monorepo tooling — os três projetos compartilham apenas o `.env` da raiz.

O backend segue estritamente a separação `routes → controllers → services → repositories`: apenas a camada de repositório acessa o driver do MongoDB diretamente. As definições dos índices Atlas Search e Atlas Vector Search vivem em `backend/config/searchIndexes.js`, importadas tanto pela API (documentação/contrato) quanto pelo script de seed (criação real dos índices).

## Modelo de dados

Coleção única `products`. Cada documento contém:

- Campos descritivos: `name`, `description`, `brand`, `categories[]`.
- `attributes`: objeto livre, cujas chaves variam por categoria — demonstra a flexibilidade de schema do MongoDB.
- `embedding`: vetor de 1536 dimensões (OpenAI `text-embedding-3-small`), usado pelo Atlas Vector Search.
- `skus[]`: variantes do produto, cada uma com seu próprio `color`, `size`, `price`, `inventory` e `gtin`. O preço exibido na UI é sempre o **menor preço entre os SKUs** (`priceFrom`, calculado via `$min` em tempo de consulta).

Uma segunda coleção, `orders`, registra as compras simuladas (`productId`, `sku`, `quantity`, `price`, `status`, `createdAt`), criadas de forma atômica junto com o decremento de estoque do SKU correspondente.

## Pré-requisitos

1. Um cluster **MongoDB Atlas** (M10 ou superior, ou tier que suporte Atlas Search + Atlas Vector Search) com a connection string em mãos.
2. Uma **API key da OpenAI** com acesso ao endpoint de embeddings.
3. **Node.js 20+** para rodar localmente, ou **Docker + Docker Compose** para subir via container.

## Como rodar

### 1. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Preencha o `.env` na raiz do projeto:

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

Gera os embeddings dos 100 produtos do catálogo, insere os documentos no Atlas, cria os índices de busca (Atlas Search, Atlas Vector Search e índices MQL de suporte a filtros) e popula a coleção `orders` com ~20 mil pedidos históricos simulados dos últimos 3 meses.

```bash
cd seed
npm install
npm run seed
```

O script é idempotente (`deleteMany` + `insertMany` a cada execução, tanto para `products` quanto para `orders`) e aguarda os índices Atlas ficarem `queryable` antes de terminar. Se a criação automática falhar (permissão insuficiente ou tier incompatível), ele imprime no console o JSON exato de cada índice para criação manual via **Atlas UI → Search → Create Search Index → JSON Editor**.

Os pedidos históricos são distribuídos de forma não-uniforme entre produtos e datas — produtos mais "populares" concentram mais vendas (distribuição long-tail), e o volume diário varia por dia da semana, tendência de crescimento e picos aleatórios pontuais — para se aproximar de uma curva de vendas real em vez de dados de teste uniformes. Esse histórico não altera o `inventory` real dos SKUs: é um snapshot de vendas passadas, independente do estoque ao vivo decrementado pela simulação de compra (`POST /orders`).

### 3. Subir a aplicação

**Via Docker Compose** (build de produção, frontend servido por Nginx):

```bash
docker compose up
```

A aplicação fica disponível em `http://localhost:8080` (o backend não é exposto diretamente — o Nginx faz proxy de `/api` para o container do backend).

**Em modo desenvolvimento**, sem Docker:

```bash
# Backend — http://localhost:5000
cd backend && npm install && npm run dev

# Frontend — http://localhost:5173 (proxy de /api para o backend)
cd frontend && npm install && npm run dev
```

## API

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/products` | Lista paginada de produtos, com filtros opcionais |
| `GET` | `/api/products/:id` | Detalhes de um produto (inclui o `embedding` bruto, usado pelo painel de debug) |
| `POST` | `/api/products` | Cria um produto (gera o embedding no momento da escrita) |
| `PUT` | `/api/products/:id` | Atualiza um produto (regenera o embedding se nome/descrição mudarem) |
| `GET` | `/api/products/:id/similar` | Produtos semanticamente semelhantes, via Atlas Vector Search |
| `GET` | `/api/search?q=&page=&category=&brand=&color=&priceMin=&priceMax=` | Busca textual via Atlas Search, com painel de diagnóstico embutido na resposta |
| `GET` | `/api/filters` | Marcas, categorias, cores e faixa de preço disponíveis, com contagem dinâmica por facet |
| `POST` | `/api/orders` | Simula uma compra: valida e decrementa estoque do SKU e registra o pedido |

## Índices Atlas

Definidos em `backend/config/searchIndexes.js`, fonte única usada tanto pelo seed (criação real) quanto como documentação do contrato de busca:

- **Atlas Search** (`product_search_index`) — full-text em `name`, `description`, `brand.name`, `categories.name`, com campos `token`/`number` para pré-filtros (`brand.id`, `categories.id`, `skus.color`, `skus.price`).
- **Atlas Vector Search** (`product_vector_index`) — campo `embedding` (1536 dimensões, similaridade por cosseno), usado exclusivamente pela feature de produtos semelhantes.

## Painel de debug

Além dos resultados de busca, a UI expõe um painel de diagnóstico (`diagnostics.tookMs/total/resultCount`) e um visualizador de JSON bruto por produto — incluindo o vetor de `embedding` — para tornar visível, na própria interface, a tecnologia de busca em uso a cada interação.

## Documentação adicional

- [`docs/specs/SPEC_V2.md`](docs/specs/SPEC_V2.md) — especificação funcional da v2 (produto, busca, pedidos).
- [`docs/DIVERGENCES.md`](docs/DIVERGENCES.md) — decisões que divergem da especificação original, com a justificativa de cada uma (ex.: uso de OpenAI em vez de Voyage AI para embeddings).

## Licença

Projeto de demonstração, sem afiliação com a MongoDB Inc. Uso livre para fins de estudo e demonstração.
