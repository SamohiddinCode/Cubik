# Архитектура CUBIK

## Продуктовая модель

```text
CUBIK Life OS
├── Planner / Time
│   ├── задачи, списки, метки и фильтры
│   ├── календарь и time blocking
│   ├── матрица Эйзенхауэра
│   ├── Pomodoro / Focus
│   ├── привычки и обратный отсчёт
│   └── статистика времени
├── Money / Wealth
│   ├── счета, капитал, доходы и расходы
│   ├── бюджеты и дневной safe-to-spend
│   └── финансовая аналитика
├── Goals / Direction
│   ├── мечты и направления
│   ├── годовые, квартальные и месячные цели
│   └── связь целей с задачами и деньгами
├── Growth / Development
│   ├── навыки и учебные планы
│   └── курсы, книги, заметки и практика
├── Health / Energy
│   ├── сон, энергия, настроение и восстановление
│   └── тренировки, питание и показатели
└── People / Connection
    ├── контакты, круги общения и важные даты
    └── встречи, обещания, follow-up и история отношений
```

## Интеллектуальный слой

- **CUBIK AI** — диалог и выполнение подтверждённых команд.
- **Memory** — факты, предпочтения, решения и устойчивый пользовательский контекст.
- **Life Graph** — связи между задачами, целями, деньгами, привычками, событиями и людьми.
- **Context Engine** — собирает актуальный контекст для конкретного экрана или вопроса.
- **Insight Engine** — рассчитывает отклонения, риски, прогнозы и рекомендации.

AI provider скрывается за единым серверным интерфейсом. Переключение Claude/Gemini или другого провайдера не должно менять UI и доменную модель. Fallback применяется только при технической недоступности или исчерпании согласованного лимита, с логированием причины и контролем стоимости.

## Целевая техническая схема

```text
Next.js Web App
  ├── App Shell + feature modules
  ├── typed client services
  └── optimistic UI + local cache
          ↓
Application API
  ├── Auth & permissions
  ├── Planner / Money / Goals services
  ├── AI orchestration
  └── Integration workers
          ↓
PostgreSQL + pgvector
  ├── normalized product data
  ├── audit log
  ├── memories / embeddings
  └── outbox / sync state
```

Дополнительные компоненты подключаются только по мере необходимости: Redis/queue для фоновых процессов, object storage для вложений, observability для ошибок и стоимости AI.

## Основные сущности MVP

- `User`, `Workspace`, `Preference`;
- `Task`, `Subtask`, `TaskList`, `Tag`, `TaskRecurrence`;
- `CalendarBlock`, `FocusSession`, `Habit`, `HabitEntry`;
- `Goal`, `Milestone`, `KeyResult`;
- `Account`, `Transaction`, `Budget`, `SavingsGoal`;
- `Memory`, `Entity`, `Relation`, `Insight`;
- `IntegrationConnection`, `SyncCursor`, `AuditEvent`.

## Безопасность

- секреты и ключи провайдеров — только на сервере;
- принцип минимальных прав для интеграций;
- шифрование соединений и чувствительных полей;
- журнал AI-команд и изменений данных;
- экспорт и удаление пользовательских данных;
- финансовые и медицинские выводы маркируются как аналитика, а не профессиональная консультация.
