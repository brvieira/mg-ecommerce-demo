# SPEC.md — MongoDB Atlas E-commerce Catalog Demo

## 1. Objetivo

Desenvolver uma aplicação web demonstrativa para evidenciar as principais capacidades do **MongoDB Atlas**, com foco em:

- Modelo de dados orientado a documentos
- Flexibilidade de schema
- Atlas Search
- Atlas Vector Search
- Busca híbrida (Texto + Vetorial)

A aplicação não possui autenticação, carrinho ou checkout. O objetivo é exclusivamente demonstrar busca e navegação em um catálogo de produtos.

---

# 2. Stack

## Backend

- Node.js
- Express
- MongoDB Driver (sem Mongoose)

## Frontend

- React
- Material UI (tema customizado alinhado ao design system LeafyGreen da MongoDB — ver seção 7)
- `@leafygreen-ui/icon` para ícones

## Banco

- MongoDB Atlas

## Embeddings

- Voyage AI

## Infraestrutura

- Docker Compose

---

# 3. Estrutura do Projeto

```
ecommerce-demo/
│
├── backend/
│   ├── routes/
│   ├── services/
│   ├── controllers/
│   ├── repositories/
│   ├── config/
│   └── app.js
│
├── frontend/
│   ├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── theme/
│
├── seed/
│   ├── products.json
│   ├── images.json
│   └── seed.js
│
├── docs/
│
├── docker-compose.yml
│
└── README.md
```

---

# 4. Modelo de Dados

Existe apenas uma coleção:

```
products
```

Cada documento representa um produto completo.

Exemplo:

```json
{
  "_id": "...",
  "name": "Apple iPhone 16",
  "description": "...",

  "brand": {
    "id": "apple",
    "name": "Apple"
  },

  "categories": [
    {
      "id": "smartphones",
      "name": "Smartphones"
    }
  ],

  "images": [
    "...url..."
  ],

  "embedding": [ ... ],

  "skus": [
    {
      "sku": "IPH16-BLK-128",
      "color": "Black",
      "price": 6999,
      "inventory": 20,
      "gtin": "...",
      "images":[]
    }
  ]
}
```

---

# 5. Base de Dados

Gerar automaticamente:

- 100 produtos
- múltiplas categorias
- marcas reais e fictícias
- imagens públicas
- descrições variadas
- embeddings utilizando Voyage AI

Categorias sugeridas:

- Smartphones
- Notebooks
- TVs
- Moda
- Calçados
- Casa
- Esportes
- Games
- Áudio
- Acessórios

---

# 6. Interface

## Header

- Logo
- Barra de pesquisa
- Seletor do modo de busca

Modos:

- Atlas Search
- Vector Search
- Hybrid Search

---

## Sidebar

Filtros:

- Categoria
- Marca
- Faixa de preço
- Cor

---

## Página Principal

Lista paginada de produtos.

Cada card apresenta:

- imagem
- nome
- marca
- categoria
- preço
- botão Ver detalhes

Também deve exibir um badge indicando:

- Atlas Search
- Vector Search
- Hybrid

---

## Página de Detalhes

Exibir:

- imagens
- descrição
- marca
- categorias
- atributos
- lista de SKUs
- preço
- estoque

---

# 7. Identidade Visual

Baseada no design system oficial da MongoDB, **LeafyGreen** (mongodb.design), implementado como um tema customizado do Material UI — não a biblioteca de componentes `@leafygreen-ui/*`, exceto pelos ícones (ver abaixo).

## Paleta de cores

Escalas completas do LeafyGreen (pacote `palette`), não apenas verde/branco/cinza/preto:

- **Verde** (cor principal): `dark3 #023430` → `base #00ED64` → `light3 #E3FCF7`
- **Cinza**: `dark4 #112733` → `base #889397` → `light3 #F9FBFA`
- **Vermelho / amarelo / azul**: reservados a estados semânticos (erro, aviso, informação), não à identidade principal

## Tipografia

A fonte oficial da LeafyGreen, Euclid Circular A, é proprietária e não redistribuível livremente. Esta implementação usa **Inter** (open-source, self-hosted via `@fontsource/inter`) como substituto visual, aplicando a escala tipográfica compacta do LeafyGreen (pacote `tokens`/`typeScales`: texto padrão 13-16px, disclaimer 12px, destaque 18px).

## Ícones

`@leafygreen-ui/icon` (biblioteca oficial de ícones SVG da MongoDB) no lugar de `@mui/icons-material`.

## Grid / Breakpoints

Breakpoints alinhados ao grid do LeafyGreen (`foundation/grid`): mobile 320px, tablet 768px, desktop 1024px, xlDesktop 1440px.

Visual:

- moderno
- clean
- minimalista
- responsivo

---

# 8. Funcionalidades

## Busca textual

Utiliza Atlas Search.

Pesquisar por:

- nome
- descrição
- marca
- categoria

---

## Busca vetorial

Utiliza Atlas Vector Search.

Consulta convertida em embedding utilizando Voyage AI.

Exemplos:

> notebook para programação

> celular com boa câmera

> cadeira confortável

---

## Busca híbrida

Executar:

- Atlas Search
- Vector Search

Combinar os resultados em um único ranking.

Cada resultado deve indicar sua origem:

- Texto
- Vetorial
- Ambos

---

# 9. Painel de Diagnóstico

Exibir:

- modo de busca
- tempo da consulta
- quantidade de resultados

Para cada produto:

- score textual
- score vetorial
- origem do resultado

Objetivo:

demonstrar visualmente como cada tecnologia contribuiu para o ranking.

---

# 10. APIs

## Produtos

```
GET /products
```

Paginação.

---

```
GET /products/:id
```

Detalhes.

---

```
GET /search
```

Parâmetros:

```
q
mode=text|vector|hybrid
page
filters
```

---

```
GET /filters
```

Retorna:

- marcas
- categorias
- cores

---

# 11. Índices MongoDB

Criar:

## Atlas Search

Campos:

- name
- description
- brand.name
- categories.name

---

## Atlas Vector Search

Campo:

```
embedding
```

Gerado utilizando Voyage AI.

---

# 12. Seed

Script responsável por:

- criar produtos
- gerar embeddings
- inserir documentos
- criar índices necessários

Executado com:

```
npm run seed
```

---

# 13. Docker

Um único comando deve iniciar toda a aplicação.

```
docker compose up
```

Serviços:

- frontend
- backend

MongoDB Atlas é utilizado remotamente.

---

# 14. Fora do Escopo

Não implementar:

- login
- carrinho
- checkout
- pedidos
- pagamentos
- administração

---

# 15. Critérios de Aceite

A aplicação deverá:

- utilizar MongoDB Atlas
- utilizar Atlas Search
- utilizar Atlas Vector Search
- possuir 100 produtos
- possuir página de detalhes
- possuir filtros
- possuir paginação
- permitir alternar entre Texto, Vetorial e Híbrido
- demonstrar claramente a origem dos resultados
- utilizar identidade visual inspirada no MongoDB
- executar via Docker Compose
- possuir código organizado e documentado
