# Notas del cliente — pedidos y feedback

> Documento vivo. Cada vez que el cliente pide algo nuevo o da feedback, se agrega acá con fecha. Anotar no es implementar: nada de esto se toca hasta que corresponda en el roadmap (ver `CLAUDE.md` sección 8) — es una lista de espera, no una lista de tareas para hoy.

---

## 2026-08-06

**Origen:** feedback informal del cliente (PF Negocios Inmobiliarios), recibido antes de tener las respuestas del cuestionario de relevamiento (`PF_Inmobiliaria_Cuestionario.pdf`).

### 1. Sección para captar propietarios — énfasis en confianza

El cliente quiere algo en la web que llame la atención específicamente para que **propietarios** le confíen la casa a la inmobiliaria, tanto para alquilar como para vender.

Esto ya está contemplado en el roadmap como parte de **F5 — "formulario para propietarios"**. Lo nuevo acá es el énfasis explícito en **confianza** como mensaje central: no alcanza con un formulario de contacto genérico, tiene que transmitir seguridad y trayectoria (SURA, PORTO, desde 2021, etc.) antes de pedirle el dato al propietario.

También mencionó "aumentar más casas a alquiler" — **a confirmar con el cliente** si se refiere a:
- (a) mostrar más inventario de alquiler en el listado una vez que haya propiedades reales cargadas, o
- (b) priorizar visualmente el alquiler por sobre la venta en el home.

### 2. Sección "Consultoría" — ofrecer o adquirir

Pide una sección de consultoría para que alguien pueda **ofrecer** (propietario que quiere vender/alquilar) o **adquirir** (interesado que busca comprar/alquilar) una casa o apartamento.

**A confirmar con el cliente antes de dar esto por incluido:** ¿es un servicio nuevo y distinto de lo que ya cubre la Propuesta Comercial (asesoramiento como línea de negocio aparte), o es otra forma de describir el mismo formulario de contacto general (propietarios + interesados) que ya está en F5? Si es lo primero, revisarlo contra el alcance firmado antes de comprometerse — no está en el roadmap original (F0–F9).

### Bloqueante activo

Todavía no llegaron las respuestas del cuestionario de relevamiento. Sin eso, estos dos puntos quedan anotados pero no se puede avanzar con contenido real para F4/F5 — y de todas formas el roadmap todavía está en F1 (login del panel), bastante antes de llegar a la web pública.

---

## 2026-08-17

**Origen:** mensaje del cliente (vía Matías). Cuatro pedidos, todos implementados ese día.

### 1. "Necesito que el azul tenga más presencia" — HECHO

Hero y cierre de la home en azul PF pleno, filete azul en el borde superior del sitio, precios del listado en azul, chips activos en azul (antes marino), bloque de citas de /contacto en azul.

### 2. Filtros: venta / alquiler / traspaso, dormitorios, familia o pareja, mascotas — HECHO

- Venta/alquiler y dormitorios ya existían.
- **Traspaso** necesitó valor nuevo en el enum `operacion_t` y **familia/pareja** una columna nueva `ideal_para text[]` — SQL en `docs/sql/2026-08-17-traspaso-ideal-para.sql`.
- **Mascotas** usa la columna `acepta_mascotas` que ya estaba.
- Los chips se derivan de los datos: el de mascotas aparece recién cuando alguna propiedad cargada acepte mascotas (al 17/8, las tres de alquiler tienen "no"), y los de familia/pareja cuando se tilden en el panel.

### 3. "No trabajan con depósito" + aseguradoras MAPFRE, Porto Seguro, Sancor — HECHO

Textos de footer, metadata, /contacto y FAQ de garantías actualizados; opciones de garantía del panel también.

**A confirmar con el cliente:** la web decía "corredores oficiales de SURA y PORTO" (sacado de su Instagram). El cliente nombró MAPFRE, Porto Seguro y Sancor — sin SURA. Decisión del 17/8: SURA queda en la lista hasta que el cliente confirme si sigue vigente. Si no sigue, sacarla de: footer, metadata de `app/layout.tsx`, intro de /contacto, FAQ de garantías (en la base) y `GARANTIAS` del panel.

### 4. "Agregar consultoría de citas" — INTERPRETADO E IMPLEMENTADO, CONFIRMAR

Se interpretó como **agendar citas**: bloque "Agendá una cita" en `/contacto#agendar` que arma un WhatsApp estructurado sin guardar datos (mismo patrón que el form de propietarios), con links desde el cierre de la home y desde cada ficha ("Agendar una visita", con el código precargado). La cita la confirma una persona respondiendo el WhatsApp — la web nunca confirma sola.

**A confirmar con el cliente** que era esto — la "sección Consultoría" del 6/8 sigue sin definirse (posible scope creep, ver esa nota).

---

## 2026-08-17 (segunda tanda — PREGUNTAS.txt)

**Origen:** respuestas del cliente al cuestionario, en `PREGUNTAS.txt` (raíz de la carpeta). Todo implementado ese mismo día.

### 1. Garantías: MAPFRE y SURA son LAS principales; ANDA y CGN no se trabajan — HECHO

- **SURA queda confirmada** (cerró el pendiente del 17/8 a la mañana): PF es **corredor de garantías de alquiler de MAPFRE y SURA**; Porto Seguro y Sancor acompañan.
- **ANDA y Contaduría (CGN) NO se trabajan**: fuera de textos públicos, FAQ y opciones del panel.
- **"Sacar lo del depósito"**: el depósito salió de los textos públicos (footer, metadata, /contacto, FAQ). En el panel quedó como opción por propiedad — la corrección de la tarde del 17/8 decía que sí lo aceptan. **Confirmar si también hay que sacarlo del panel.**
- Logos de MAPFRE y SURA (los bajó el cliente/Matías) en el hero de la home, en `public/logos/` — se limpiaron los fondos sucios de descarga (damero pintado en el de SURA). Más tarde ese día llegaron también los de **Porto Seguro y Sancor** (misma limpieza): los cuatro van con logo, en dos niveles — MAPFRE y SURA en chips grandes (las principales), Porto Seguro y Sancor más chicos.

### 2. Descripción del inicio "más hablada" — HECHO

"Somos una agencia inmobiliaria de Tacuarembó y desde 2021 trabajamos con casas, apartamentos, campos y chacras…" en el hero, /contacto y metadata.

### 3. Agentes MiCasa de Banco Santander — HECHO

Gestionan financiamiento con Santander. Mencionado en hero, footer, /contacto y FAQ nueva.

### 4. Comisión, seña, mes adelantado, Clearing — HECHO (FAQ)

FAQ "¿Cobran comisión?" actualizada con las palabras del cliente: por única vez, 60% en base al precio del contrato, mes adelantado, se puede señar, sujeto a Clearing. **Confirmar la redacción exacta del 60% con el cliente** (¿60% de un mes de alquiler?) — el txt decía "60% por única vez en base al precio del contacto [sic]".

### 5. Tasaciones de cualquier tipo — HECHO (FAQ + /contacto)

### 6. Requisitos para publicar una propiedad — HECHO

Padrón, propietario, dirección y ubicación, estado general (remodelaciones, nueva, a estrenar). En /contacto sobre el form de propietarios + FAQ nueva.

### 7. Facebook — HECHO

facebook.com/inmb.catalina como clave `facebook` en `config_negocio`; link en footer y /contacto.

### 8. Horario nuevo — HECHO

Lunes a viernes de 9 a 12 y de 15:30 a 18. **Sábados NO** (antes decía sábados de 9 a 12). Actualizado en `config_negocio` y en el seed de `setup-dev.mjs`.

### 9. "Fix responsive para que ande efectivo en cel" — HECHO

Encontrado y corregido: el chip de WhatsApp del header (número entero + `whitespace-nowrap`) desbordaba 7px el viewport en 390px **en todas las páginas**. Ahora en celular el chip muestra solo el ícono (número en `sr-only`) y los gaps del nav se achican. Verificado sin desborde en /, /contacto, ficha y legales.

### ⚠️ Hallazgo del mismo día: TB-004 no existe más

Al correr `scripts/verify-setup.mjs` fallan los 3 checks del precio oculto: **TB-004 fue borrada de la base** (las propiedades actuales son TB-005–TB-008, datos reales del cliente). CLAUDE.md §4.2 la define como caso de prueba permanente. Hoy ninguna propiedad tiene `precio_publico=false`, así que el guardrail del precio oculto quedó sin caso vivo. **Decidir con Matías:** recrearla (aparecería en la web pública entre propiedades reales) o esperar a que el cliente cargue un campo real con precio reservado.
