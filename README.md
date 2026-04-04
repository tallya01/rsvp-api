# 💍 Wedding RSVP API

API REST em Node.js + Express + PostgreSQL (Sequelize) para gerenciar confirmações de presença em casamentos.

---

## Estrutura do projeto

```
rsvp-api/
├── src/
│   ├── db/
│   │   └── database.js        # Conexão Sequelize
│   |   ├── models/
│   │       ├── GuestCode.js       # Tabela de códigos de convidados
│   │       └── Confirmation.js    # Tabela de confirmações
│   ├── routes/
│   │   ├── guestCodes.js      # Rotas /api/codes
│   │   └── confirmations.js   # Rotas /api/confirmations
│   └── server.js              # Entry point
├── .env.example
├── package.json
└── README.md
```

---

## Configuração e execução

### 1. Pré-requisitos

- Node.js 18+
- PostgreSQL

### 2. Instalar dependências

```bash
npm install
```

### 2. Iniciar (sincroniza as tabelas automaticamente)

```bash
npm start          # produção
npm run dev        # desenvolvimento com hot-reload (nodemon)
```

---

## Tabelas

### `guest_codes`

| Coluna           | Tipo         | Descrição                                      |
|------------------|--------------|------------------------------------------------|
| `code`           | VARCHAR(4) PK| Código alfanumérico único do convidado         |
| `first_name`     | VARCHAR(100) | Primeiro nome do convidado                     |
| `max_companions` | INTEGER      | Quantidade de acompanhantes permitidos         |
| `confirmed`      | BOOLEAN      | Se o código já foi utilizado para confirmar    |
| `attending`      | BOOLEAN/NULL | Resposta positiva (`true`) ou negativa (`false`)|
| `createdAt`      | TIMESTAMP    | Data de criação                                |
| `updatedAt`      | TIMESTAMP    | Última atualização                             |

### `confirmations`

| Coluna      | Tipo         | Descrição                                  |
|-------------|--------------|-------------------------------------------|
| `id`        | SERIAL PK    | Identificador serial                       |
| `code`      | VARCHAR(4) FK| Código da tabela `guest_codes`             |
| `full_name` | VARCHAR(150) | Nome completo do convidado                 |
| `is_child`  | BOOLEAN      | Se o convidado é criança                   |
| `age`       | INTEGER/NULL | Idade (preenchida apenas para crianças)    |
| `createdAt` | TIMESTAMP    | Data de criação                            |
| `updatedAt` | TIMESTAMP    | Última atualização                         |

---

## Endpoints

### Códigos de convidados — `/api/codes`

#### `GET /api/codes/:code`
Consulta um código de confirmação.

**Exemplo de resposta:**
```json
{
  "code": "A1B2",
  "first_name": "Ana",
  "max_companions": 1,
  "confirmed": false,
  "attending": null
}
```

---

#### `GET /api/codes?page=1&limit=10`
Lista todos os códigos com paginação.

| Query param | Padrão | Descrição               |
|-------------|--------|-------------------------|
| `page`      | 1      | Página                  |
| `limit`     | 10     | Itens por página (máx. 100) |

**Exemplo de resposta:**
```json
{
  "total": 5,
  "page": 1,
  "limit": 10,
  "totalPages": 1,
  "data": [ ... ]
}
```

---

### Confirmações — `/api/confirmations`

#### `POST /api/confirmations`
Registra um ou mais convidados para um código.

**Body:**
```json
{
  "code": "A1B2",
  "attending": true,
  "guests": [
    { "full_name": "Ana Silva", "is_child": false },
    { "full_name": "Pedro Silva", "is_child": true, "age": 7 }
  ]
}
```

> **Regras:**
> - O código não pode ter sido confirmado anteriormente.
> - A quantidade de `guests` não pode exceder `max_companions + 1`.
> - `age` é obrigatório quando `is_child = true` e proibido quando `false`.

**Resposta 201:**
```json
{
  "message": "Confirmation registered successfully.",
  "guestCode": { ... },
  "guests": [ ... ]
}
```

---

#### `GET /api/confirmations/:code`
Lista todos os convidados confirmados para um código.

**Exemplo de resposta:**
```json
{
  "guestCode": { "code": "A1B2", "first_name": "Ana", "confirmed": true, "attending": true },
  "guests": [
    { "id": 1, "code": "A1B2", "full_name": "Ana Silva", "is_child": false, "age": null },
    { "id": 2, "code": "A1B2", "full_name": "Pedro Silva", "is_child": true, "age": 7 }
  ]
}
```

---

#### `DELETE /api/confirmations/:id`
Remove uma entrada de confirmação pelo `id` serial.

> Se a entrada removida for a última do código, o código volta ao estado `confirmed: false, attending: null`.

**Resposta 200:**
```json
{ "message": "Entry deleted successfully." }
```

---

#### `GET /api/confirmations?page=1&limit=10`
Lista todas as confirmações com paginação, incluindo dados do código associado.

---

## Lógica de negócio

1. **Confirmação positiva ou negativa:** o campo `attending` no body do `POST` define se o convidado confirmou presença (`true`) ou recusou (`false`).
2. **Limite de acompanhantes:** o total de entradas em `guests` (incluindo o convidado principal) não pode ultrapassar `max_companions + 1`.
3. **Idempotência:** um código só pode ser confirmado uma vez. Tentativas subsequentes retornam `409 Conflict`.
4. **Transações:** o `POST` e o `DELETE` utilizam transações para garantir consistência entre as duas tabelas.
