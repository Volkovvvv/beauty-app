# Мастер CRM — Telegram Mini App

Мини-приложение для бьюти-мастеров любого профиля — ногти, брови, ресницы, волосы,
макияж, косметология, массаж, депиляция: запись клиенток,
лента дня со свободными окнами, карточка клиентки с фото работ, деньги.
Сверстано по дизайну «Cherry glaze» (`Nail Master.dc.html`, секция 1a).

Репозиторий — два приложения: фронт (этот каталог) и API в [api/](api/README.md)
(NestJS + PostgreSQL + бот). Сначала поднимите API по его README, затем:

```bash
npm install
npm run dev        # http://localhost:5174 — вход без Telegram, тестовым мастером
npm run typecheck  # tsc --noEmit, strict
npm run build      # проверка типов + сборка в dist/
```

TypeScript в strict-режиме, без `.js`. Код сверен с правилами
vercel-react-best-practices (то, что применимо к SPA на Vite).

## Структура (FSD, как в tutor-crm)

- `app/` — App, навигация, стор (данные с API, оптимистичные правки), мапперы форматов API
- `pages/` — вкладки «Сегодня», «Записи», «Клиенты», «Деньги» и карточка клиентки
- `features/add-appointment/` — новая запись и перенос, слоты по пересечению
- `widgets/` — карточка «Следующая», сетка недели
- `entities/` — услуги, клиентки, записи (модель + мелкие UI)
- `shared/` — UI-кит, токены (`shared/ui/styles/tokens.css`), даты, формат, Telegram
# beauty-app
