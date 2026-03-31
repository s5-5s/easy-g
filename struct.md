# struct.md

## Корень проекта

- `index.html` — каркас приложения и оверлей-компонентов.
- `manifest.json` — манифест PWA.
- `service-worker.js` — offline cache shell/ассетов.
- `README.md` — описание проекта и запуск.
- `rules.md` — общие правила.
- `rules-ui.md` — правила UI-структуры.
- `struct.md` — структура репозитория.
- `ui-struct.md` — структура интерфейса.

## Каталог `css`

- `layout.css` — единая точка импорта.
- `vars.css`, `base.css` — тема, шрифты и базовые правила.
- `app-layout.css`, `app.css` — корневая сцена приложения.
- `app-header-layout.css`, `app-header.css` — верхние кнопки (book/theme).
- `topic-navigation-layout.css`, `topic-navigation.css` — единый sidebar (список тем + подробности темы).
- `model-view-layout.css`, `model-view.css` — область рендера модели.
- `lesson-panel-layout.css`, `lesson-panel.css` — legacy-файлы старой отдельной карточки (не подключаются в `layout.css`).

## Каталог `js`

- `index.js` — bootstrap и регистрация SW.
- `easy-g-app.js` — общий state и оркестрация UI.
- `app-header.js` — кнопки `book` и `theme`.
- `topic-navigation.js` — sidebar: список тем и встроенная карточка темы.
- `model-view.js` — scene/camera/controls/render.
- `geometry-topics.js` — данные тем.
- `geometry-model-factory.js` — фабрика 3D-моделей тем.
- `lesson-panel.js` — legacy-класс старой отдельной карточки.

## Каталог `js/vendor`

- `three.module.js` — локальный three.js.
- `OrbitControls.js` — камера/интеракции.

## Каталог `fonts`

- пользовательские шрифты `SF Pro Text` (опционально) и локальные fallback-файлы.

## Каталог `ideas`

- скетчи UX (`desktop-*`, `phone-pad-*`) и референсы Calendar (`macos-calendar-*`).
