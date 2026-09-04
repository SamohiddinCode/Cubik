# CUBIK — Life OS

CUBIK — персональная операционная система для шести связанных областей жизни:

1. Planner / Time — время и действия.
2. Money / Wealth — деньги и капитал.
3. Goals / Direction — цели и направление.
4. Growth / Development — обучение и развитие.
5. Health / Energy — здоровье и энергия.
6. People / Connection — отношения и окружение.

Внутренний слой продукта: CUBIK AI, Memory, Life Graph, Context Engine и Insight Engine. AI работает внутри текущего контекста, объясняет предлагаемые изменения и не меняет пользовательские данные без подтверждения.

## Текущее состояние

Реализован первый интерактивный вертикальный срез:

```text
Landing → Auth → Today Planner → Task Inspector → Contextual AI
```

На `/app/today` уже работают:

- постоянная панель шести граней CUBIK;
- сворачиваемая навигация Planner;
- добавление и завершение задач в памяти браузера;
- выбор задачи и панель подробностей;
- визуальное расписание дня;
- подзадачи, связанная цель и контекстный CUBIK AI;
- меню аккаунта в правом верхнем углу;
- адаптивная компоновка.

Данные пока демонстрационные и после обновления страницы сбрасываются.

## Локальный запуск

Требования: Node.js 20+ и pnpm 11.

```bash
pnpm install
pnpm dev
```

Откройте [http://localhost:3000/app/today](http://localhost:3000/app/today).

Проверка перед отправкой изменений:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

## Структура

```text
src/app/page.tsx                    рекламный лендинг
src/app/auth/page.tsx               вход и регистрация
src/app/app/today/page.tsx          интерактивный экран «Сегодня»
src/app/app/today/today.module.css  стили экрана «Сегодня»
src/app/globals.css                 глобальные стили лендинга и авторизации
src/components/cubik-mark.tsx       временный знак CUBIK
docs/AI_HANDOFF.md                  инструкция для следующего AI/разработчика
docs/ARCHITECTURE.md                продуктовая и техническая архитектура
docs/ROADMAP.md                     порядок дальнейшей разработки
```

## Документация

- [Контекст и handoff для AI](docs/AI_HANDOFF.md)
- [Архитектура CUBIK](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)

## Статус

Проект находится на стадии UI foundation. Это не production-версия: авторизация, база данных, синхронизация, интеграции и настоящий AI backend ещё не подключены.
