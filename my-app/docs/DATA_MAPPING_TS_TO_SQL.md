# Mapeo TypeScript ↔ SQL (Supabase)

Referencia rápida para implementar el adapter de datos.

## Convención

- TypeScript: `camelCase`
- SQL: `snake_case`

## Debt

| TypeScript (Debt)     | SQL (debts)        |
|-----------------------|--------------------|
| id                    | id                 |
| name                  | name               |
| type                  | type               |
| localCurrency         | local_currency      |
| localFee              | local_fee          |
| dollarFee             | dollar_fee         |
| totalLocal            | total_local        |
| totalDollars          | total_dollars      |
| feeToUpdate           | fee_to_update      |
| feeToUpdateDollars    | fee_to_update_dollars |
| inOrder               | in_order           |
| currentPlan           | current_plan       |
| bankName              | bank_name          |
| bankPhone             | bank_phone         |
| hasCallTask           | has_call_task      |
| callCompleted         | call_completed     |
| paymentDate           | payment_date (DATE, ISO string → date) |
| cutDate               | cut_date (DATE)    |
| interestRate          | interest_rate      |
| closedAt              | closed_at (TIMESTAMPTZ) |
| createdAt             | created_at         |
| updatedAt             | updated_at         |
| —                     | user_id (UUID, de auth) |

## PaymentCommitment

| TypeScript            | SQL (payment_commitments) |
|-----------------------|---------------------------|
| id                    | id                        |
| debtId                | debt_id                   |
| date                  | date (DATE)               |
| amountLocal           | amount_local              |
| amountDollars         | amount_dollars            |
| status                | status                    |
| paymentType           | payment_type              |
| notes                 | notes                     |
| createdAt             | created_at                |
| updatedAt             | updated_at                |
| completedAt           | completed_at              |

## CallRecord

| TypeScript            | SQL (call_records)  |
|-----------------------|---------------------|
| id                    | id                  |
| debtId                | debt_id             |
| date                  | date (DATE)         |
| notes                 | notes               |
| commitmentsCreated    | commitments_created (JSONB) |
| createdAt             | created_at          |

## FixedExpense

| TypeScript     | SQL (fixed_expenses) |
|----------------|----------------------|
| id             | id                   |
| name           | name                 |
| amountLocal    | amount_local         |
| amountDollars  | amount_dollars       |
| localCurrency  | local_currency       |
| category       | category             |
| dueDate        | due_date (TEXT)      |
| paymentDate    | payment_date (DATE)  |
| paidForMonth   | paid_for_month       |
| notes          | notes                |
| createdAt      | created_at           |
| updatedAt      | updated_at           |
| —              | user_id              |

## Asset

| TypeScript     | SQL (assets)   |
|----------------|----------------|
| id             | id             |
| name           | name           |
| type           | type           |
| valueLocal     | value_local    |
| valueDollars   | value_dollars  |
| localCurrency  | local_currency |
| purchaseDate   | purchase_date (DATE) |
| notes          | notes          |
| createdAt      | created_at     |
| updatedAt      | updated_at     |
| —              | user_id        |

## Income

| TypeScript       | SQL (incomes)    |
|------------------|------------------|
| id               | id               |
| name             | name             |
| amountLocal      | amount_local     |
| amountDollars    | amount_dollars   |
| localCurrency    | local_currency   |
| type             | type             |
| frequency        | frequency        |
| nextPaymentDate  | next_payment_date (DATE) |
| notes            | notes            |
| createdAt        | created_at       |
| updatedAt        | updated_at       |
| —                | user_id          |

## Notification

| TypeScript | SQL (notifications) |
|------------|---------------------|
| id         | id                  |
| message    | message             |
| type       | type                |
| createdAt  | created_at          |
| read       | read                |
| meta       | meta (JSONB)        |
| —          | user_id             |

## Subscription

| TypeScript | SQL (subscriptions) |
|------------|---------------------|
| plan       | plan                |
| status     | status              |
| endsAt     | ends_at (TIMESTAMPTZ) |
| interval   | interval            |
| —          | user_id (PK)        |

## User preferences (user_preferences)

| Origen storage     | SQL column            |
|--------------------|------------------------|
| localCurrency      | local_currency        |
| language           | language              |
| themeMode          | theme_mode            |
| colorScheme        | color_scheme          |
| hideAmounts        | hide_amounts          |
| hasSeenInitialSetup| has_seen_initial_setup |

## List orders (list_orders)

| Origen storage   | list_type      | order_ids (JSONB)   |
|------------------|----------------|---------------------|
| debtsOrder       | 'debts'        | ["id1", "id2", ...] |
| fixedExpensesOrder | 'fixed_expenses' | ["id1", ...]     |
| assetsOrder      | 'assets'       | ["id1", ...]        |
| incomesOrder     | 'incomes'      | ["id1", ...]        |

## Fechas

- En TS sueles usar **ISO strings** (`paymentDate`, `cutDate`, `date`, `createdAt`, etc.).
- En SQL: `DATE` para solo fecha (YYYY-MM-DD), `TIMESTAMPTZ` para fecha-hora.
- Al leer de Supabase: formatear a ISO string si la app espera string.
- Al escribir: pasar string ISO; Postgres acepta `'2025-02-14'` o `'2025-02-14T12:00:00Z'` según el tipo de columna.
