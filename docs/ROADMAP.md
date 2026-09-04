# Roadmap CUBIK

Статусы: `[x]` выполнено, `[~]` в работе, `[ ]` запланировано.

## Фаза 0 — Product foundation

- `[x]` центральная идея шести граней;
- `[x]` базовая архитектура модулей;
- `[x]` первый визуальный язык и App Shell;
- `[x]` рекламный лендинг и Auth-заглушка;
- `[~]` интерактивный прототип Today Planner;
- `[ ]` финальные design tokens, логотип и набор иконок;
- `[ ]` PRD Planner и критерии MVP.

## Фаза 1 — Planner foundation

- `[ ]` компонентная декомпозиция текущего экрана;
- `[ ]` доменная модель и постоянное хранилище задач;
- `[ ]` CRUD задач, списков, меток и фильтров;
- `[ ]` Today, Tomorrow, Next 7 Days, Inbox, All и Summary;
- `[ ]` поиск, сортировка и группировка;
- `[ ]` календарь и time blocking;
- `[ ]` матрица Эйзенхауэра;
- `[ ]` Focus/Pomodoro Lite и привычки Lite;
- `[ ]` уведомления и клавиатурные команды.

## Фаза 2 — Backend и аккаунт

- `[ ]` PostgreSQL и миграции;
- `[ ]` регистрация, вход, сессии и восстановление доступа;
- `[ ]` синхронизация между устройствами;
- `[ ]` роли, permissions и audit log;
- `[ ]` экспорт, удаление и резервное копирование данных.

## Фаза 3 — CUBIK AI + Memory Lite

- `[ ]` единый серверный AI gateway;
- `[ ]` контекст задачи и дня;
- `[ ]` preview → confirm → apply → undo;
- `[ ]` ежедневный обзор и планирование нагрузки;
- `[ ]` память предпочтений с пользовательским контролем;
- `[ ]` лимиты, стоимость, fallback и observability.

## Фаза 4 — Money / Wealth MVP

- `[ ]` счета, наличные, карты и капитал;
- `[ ]` транзакции и категории;
- `[ ]` месячные бюджеты и safe-to-spend;
- `[ ]` цели накопления;
- `[ ]` связь расходов с целями и планами;
- `[ ]` AI-анализ бюджета.

## Фаза 5 — Связанный MVP Alpha

- `[ ]` Planner + Goals Lite + Money Lite;
- `[ ]` Calendar integration и onboarding;
- `[ ]` продуктовая аналитика;
- `[ ]` accessibility, performance и usability test;
- `[ ]` Private Alpha для 30–100 пользователей.

## Фаза 6 — Остальные грани

- `[ ]` Growth / Development;
- `[ ]` Health / Energy;
- `[ ]` People / Connection;
- `[ ]` Life Graph и межмодульные insights;
- `[ ]` расширенные интеграции.

## Фаза 7 — Запуск

- `[ ]` Private Beta и billing;
- `[ ]` публичная beta;
- `[ ]` production hardening;
- `[ ]` публичный запуск;
- `[ ]` retention loops и CUBIK 2.0.

## Текущий фокус

Не начинать все шесть модулей параллельно. Ближайшая последовательность:

```text
Today UI foundation
→ Task domain model
→ persistence
→ Planner CRUD and views
→ Auth + PostgreSQL
→ AI contextual actions
→ Money Lite
→ Connected Alpha
```
