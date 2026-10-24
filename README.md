# Star Wars Web

Frontend en Angular 21 para el challenge de Star Wars. Permite registrarse e iniciar sesión contra el
backend (`star-wars-api`) y consultar People, Films, Starships y Vehicles con filtros por ID y nombre,
ordenamiento, paginación y una vista de detalle de cada elemento. Se comunica únicamente con ese backend, nunca con SWAPI.

- Demo: https://star-wars-web.onrender.com (el registro es público; el primer acceso puede tardar alrededor de un
  minuto porque el backend se suspende sin tráfico).
- Backend: https://github.com/leo2143/star-wars-api

## Stack

Angular 21.2 (standalone, zoneless, signals, `OnPush`), TypeScript 5.9, RxJS 7.8, Tailwind CSS 4.3
(tokens con `@theme` en `src/styles.css`), Vitest + jsdom, Prettier.

## Requisitos

- Node.js 20.19+, 22.12+ o 24 (requisito de Angular 21) y npm 10.
- Backend en ejecución (por defecto en `http://localhost:8080`).

## Ejecución local

```bash
npm ci
npm start          # http://localhost:4200
```

`npm start` usa la configuración `development`, que sustituye `src/environments/environment.ts` por
`src/environments/environment.development.ts` (`apiBaseUrl: 'http://localhost:8080'`).

Otros scripts:

```bash
npm test -- --watch=false   # tests (Vitest vía ng test)
npm run build               # build de producción en dist/star-wars-web/browser
```

## Configurar la URL de la API

El valor se define en tiempo de build y queda **visible en el bundle**; no es un secreto.

| Archivo                                       | Uso                   | `apiBaseUrl`                              |
| --------------------------------------------- | --------------------- | ----------------------------------------- |
| `src/environments/environment.development.ts` | `ng serve`, `ng test` | `http://localhost:8080`                   |
| `src/environments/environment.ts`             | build de producción   | `https://star-wars-api-sgro.onrender.com` |

Para apuntar a otro backend, reemplace la URL de `environment.ts` y vuelva a compilar.
Declarar una variable de entorno en el panel de Render **no** modifica un JavaScript ya compilado.

## CORS en el backend

El backend solo acepta los orígenes configurados en `CORS_ALLOWED_ORIGINS` (por defecto
`http://localhost:4200`). En Render, configure esa variable en el servicio del backend con la URL
pública del frontend, sin barra final y sin comodines, por ejemplo
`https://star-wars-web.onrender.com`. No es necesario modificar el código del backend.

## Autenticación y almacenamiento de la sesión

- **Login:** `POST {apiBaseUrl}/api/v1/auth/login` con `{ username, password }`; el backend responde
  `{ accessToken, tokenType, expiresIn, refreshToken, refreshExpiresIn }` (duraciones en segundos).
  La contraseña nunca se guarda. El nombre de usuario no distingue mayúsculas en el backend.
- **Almacenamiento:** el par de tokens y la fecha de fin de la sesión (`refreshExpiresIn`) se guardan en
  `sessionStorage`. Sobrevive a una recarga de la página y desaparece al cerrar la pestaña. No se usa
  `localStorage`. Una sesión guardada sin refresh token se descarta.
- Un interceptor funcional añade `Authorization: Bearer` solo a URLs que empiezan por `apiBaseUrl` y
  nunca en `login`, `refresh`, `logout` ni `register`.
- **Refresh:** ante un `401` de la API (excepto los endpoints de `/api/v1/auth`), el interceptor llama a
  `POST /api/v1/auth/refresh` con `{ refreshToken }`, guarda el par rotado y reintenta la petición original
  **una sola vez** con el token nuevo. No hay refresh proactivo: el `401` es la señal, por lo que no
  depende del reloj del navegador. Si el refresh falla, o si el reintento vuelve a dar `401`, se limpia
  la sesión y se redirige a `/login?reason=expired&returnUrl=...`. Otros códigos (403, 404, 5xx) no se
  tratan como problemas de autenticación.
- **Single-flight:** todas las peticiones que reciben `401` a la vez comparten un único refresh. El
  backend rota el refresh token y trata un segundo uso del mismo como robo (detección de reutilización),
  lo que revoca toda la sesión; dos refresh en paralelo cerrarían la sesión del usuario.
- **Duración de la sesión:** es la del refresh token (el token rotado hereda el vencimiento del
  anterior). Al llegar ese momento la sesión se cierra automáticamente con `reason=expired`.
- **Logout:** `POST /api/v1/auth/logout` con `{ refreshToken }` se envía en segundo plano; la salida a
  `/login` y la limpieza local no esperan la respuesta ni dependen de que tenga éxito. El access token
  sigue siendo válido en el backend hasta su vencimiento.
- `returnUrl` solo admite rutas internas (protección contra redirecciones abiertas).
- Los guards (`authGuard`, `guestGuard`) mejoran la navegación; **la autorización real la hace el backend**.

### Registro

La pantalla `/register` llama a `POST /api/v1/auth/register` con `{ username, password }` y valida antes de
enviar las mismas reglas del backend:

- Usuario: de 3 a 50 caracteres `[a-zA-Z0-9._-]` (el backend lo guarda en minúsculas).
- Contraseña: de 15 a 64 caracteres, como máximo 72 bytes en UTF-8 (los acentos y los emoji ocupan más de
  un byte) y distinta del usuario sin distinguir mayúsculas.

Los errores `400` con `errors[]` se muestran en el campo correspondiente y un `409` ("Username is not
available.") en el campo de usuario. Al registrarse, redirige a `/login?registered=1&username=<usuario>`:
el login muestra la confirmación y precarga el usuario solo si cumple el patrón anterior.

### Límite de peticiones (429)

Un `429` se traduce en el error `rate-limited`, con `retryAfterSeconds` tomado de `Retry-After`. El login y
el registro muestran "Too many attempts. Try again in N seconds." (sin el número si el backend no envía
la cabecera); los listados muestran el estado de error con la espera sugerida.

**Limitación de seguridad:** `sessionStorage` es accesible desde JavaScript, por lo que un ataque XSS
podría robar el token. Angular escapa el contenido por defecto y la aplicación no inserta HTML
externo ni usa `bypassSecurityTrust*`, pero el almacenamiento no sustituye la prevención de XSS.
La alternativa sería usar cookies `HttpOnly` emitidas por el backend o una arquitectura BFF.

## Endpoints consumidos

La API está versionada por ruta: el prefijo `/api/v1` vive en una sola constante (`API_PREFIX`, en `src/app/http/api-url.ts`).

| Método | Endpoint                 | Parámetros                                                     |
| ------ | ------------------------ | -------------------------------------------------------------- |
| POST   | `/api/v1/auth/login`     | cuerpo `{ username, password }`                                |
| POST   | `/api/v1/auth/refresh`   | cuerpo `{ refreshToken }`; devuelve el par rotado              |
| POST   | `/api/v1/auth/logout`    | cuerpo `{ refreshToken }`; responde `204`                      |
| POST   | `/api/v1/auth/register`  | cuerpo `{ username, password }`; responde `201`                |
| GET    | `/api/v1/people`         | `page`, `id`, `name`, `sort`                                   |
| GET    | `/api/v1/films`          | `page`, `id`, `name` (busca por título), `sort`                |
| GET    | `/api/v1/starships`      | `page`, `id`, `name`, `sort`                                   |
| GET    | `/api/v1/vehicles`       | `page`, `id`, `name`, `sort`                                   |
| GET    | `/api/v1/people/{id}`    | detalle de un personaje, con sus películas, naves y vehículos  |
| GET    | `/api/v1/films/{id}`     | detalle de una película, con sus personajes, naves y vehículos |
| GET    | `/api/v1/starships/{id}` | detalle de una nave, con sus películas                         |
| GET    | `/api/v1/vehicles/{id}`  | detalle de un vehículo, con sus películas                      |

Respuesta de los listados: `{ count, currentPage, totalPages, nextPage, previousPage, results }`
(tamaño de página fijo en 10). Los filtros y la página viven en la URL (`/people?page=2&name=luke`),
lo que permite enlaces directos y recargas. Los listados no incluyen relaciones: solo las devuelven
los endpoints de detalle, como listas de objetos mínimos (`FilmMin`, `StarshipMin`, `VehicleMin`,
`PersonMin`).

### Ordenamiento

- El orden vive en la URL como `sort=campo` (ascendente) o `sort=-campo` (descendente), por ejemplo
  `/people?sort=-mass`. Sin `sort` el backend usa su orden por defecto y el parámetro no se envía.
- Las columnas ordenables declaran un `sortKey` con el nombre del campo del backend:
  - People: `name`, `height`, `mass`.
  - Films: `title`, `episodeId` (columna Episode), `releaseDate`.
  - Starships y Vehicles: `name`, `costInCredits` (columna Cost).
- Los encabezados ordenables son botones con `aria-sort` (`ascending`, `descending` o `none`) y un icono
  que indica la dirección. Cada clic recorre sin orden, ascendente, descendente y sin orden. En pantallas
  estrechas (tarjetas) hay un selector "Sort by" con cada columna en ambas direcciones y "Default order".
- Cambiar el orden vuelve a la página 1 y conserva `id` y `name`; paginar y filtrar conservan el orden.
- Un `sort` con formato inválido o que no corresponde a una columna ordenable de la página se ignora y se
  muestra el orden por defecto.

## Rutas

Las rutas de `/login` y `/register` son públicas (`guestGuard` redirige al dashboard a quien ya inició
sesión). El resto vive dentro del shell y está protegido por `authGuard`. Cada página se carga de forma
diferida.

| Ruta                                                           | Pantalla                                 |
| -------------------------------------------------------------- | ---------------------------------------- |
| `/login`                                                       | inicio de sesión                         |
| `/register`                                                    | registro de usuario                      |
| `/dashboard`                                                   | accesos a las cuatro categorías          |
| `/people`, `/films`, `/starships`, `/vehicles`                 | listados con filtros, orden y paginación |
| `/people/:id`, `/films/:id`, `/starships/:id`, `/vehicles/:id` | detalle de un elemento                   |

### Vistas de detalle

- Cada fila (tabla) o tarjeta (móvil) de un listado es un enlace real (`<a routerLink>`) a su detalle.
- El detalle muestra los datos escalares (con la misma normalización de `unknown`/`n/a` y unidades que
  los listados) y las relaciones como enlaces a sus propios detalles. Una relación vacía muestra
  "None recorded". Las películas muestran el _opening crawl_.
- **Volver al listado:** el enlace del listado añade `?back=` con la página, los filtros y el orden
  (`/people/1?back=page%3D2%26name%3Dluke%26sort%3D-mass`). El detalle reconstruye la URL del listado a
  partir de `page`, `id`, `name` y `sort` validándolos igual que el listado (del orden solo se comprueba
  el formato; el listado descarta el que no corresponda a una de sus columnas); cualquier otro valor se ignora y se vuelve al
  listado sin filtros. Un acceso directo al detalle (sin `back`) también funciona. Al navegar entre
  detalles relacionados el enlace de vuelta apunta al listado de esa entidad; el botón Atrás del
  navegador conserva el historial.
- Estados: esqueleto de carga (`aria-busy`), vista "not found" para un `404` o un `:id` que no sea un
  entero positivo (en ese caso no se llama al backend) y el estado de error con reintento para el resto.
  Al cambiar de detalle se cancela la petición anterior y el foco pasa al encabezado `h1`.

## Estructura

```text
src/app/
  auth/
    pages/          pantallas de login y de registro (support/: reglas de credenciales)
    session/        AuthService, almacenamiento de sesión e interfaces de sesión
    guard/          guards de ruta y validación de la URL de retorno
    auth.interceptor.ts   adjunta el token y renueva la sesión
  http/             URL base de la API y traducción de errores HTTP
  interfaces/       interfaces de las entidades (common/: consulta, página y fila de listado)
  components/
    layout/         shell, sidebar, page-header y navigation.ts (entradas del menú)
    list/           entity-list-page, entity-table, entity-filters, pagination, list-state
                    (support/: estado y parámetros del listado, enlace de vuelta)
    detail/         detail-page, attribute-grid, related-list
                    (support/: estado de carga del detalle)
  pages/            dashboard y una carpeta por entidad (films, people, starships, vehicles)
                    con su listado (*-list) y su detalle (*-detail); support/ guarda
                    las suites de test compartidas por los listados y los detalles
  mappers/ services/
```

## Limitaciones conocidas

- La API ya no expone el planeta natal de los personajes (el backend no tiene recurso de planetas), por lo que People y su detalle no lo muestran.
- El orden es de un solo campo; no hay ordenamiento por varias columnas.
- Si el refresh falla por un error transitorio (por ejemplo, sin conexión), la sesión se cierra igualmente.
- El enlace de vuelta de un detalle apunta siempre al listado de su propia entidad; no recuerda el
  detalle desde el que se llegó (para eso está el botón Atrás del navegador).
- Los iconos usan Font Awesome desde un CDN (con SRI).
