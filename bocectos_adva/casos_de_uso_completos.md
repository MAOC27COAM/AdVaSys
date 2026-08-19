====================================================================
ESPECIFICACION DE CASOS DE USO - SISTEMA INTRANET ADUNI VALLEJO
====================================================================
Basado en: funcionalidades_por_modulo_y_actores.txt
Formato: Mermaid listo para renderizar
Version: 1.0
Fecha: Mayo 2026

====================================================================
ACTORES DEL SISTEMA
====================================================================

```mermaid
usecaseDiagram
    actor Admin
    actor Matriculador
    actor Estudiante
    actor Sistema
```

ID     | Actor         | Descripcion
-------|---------------|----------------------------------------------------
ACT-01 | Admin         | Gestiona operaciones administrativas y academicas totales
ACT-02 | Matriculador  | Opera el flujo academico y administrativo diario
ACT-03 | Estudiante    | Consulta informacion personal y academica
ACT-04 | Sistema       | Actor secundario: base de datos, autenticacion, notificaciones


====================================================================
MODULO: MATRICULA (MAT)
====================================================================

### DIAGRAMA DE CASOS DE USO - MATRICULA

```mermaid
usecaseDiagram
    actor Admin
    actor Matriculador

    usecase "MAT-CU01: Seleccionar ciclo de trabajo" as MAT1
    usecase "MAT-CU02: Matricular nuevo estudiante" as MAT2
    usecase "MAT-CU03: Matricular estudiante recurrente" as MAT3
    usecase "MAT-CU04: Editar estudiante matriculado" as MAT4
    usecase "MAT-CU05: Consultar lista de matriculados" as MAT5
    usecase "MAT-CU06: Visualizar detalle del estudiante" as MAT6
    usecase "MAT-CU07: Generar plancha de carnets" as MAT7

    Admin --> MAT1
    Admin --> MAT2
    Admin --> MAT3
    Admin --> MAT4
    Admin --> MAT5
    Admin --> MAT6
    Admin --> MAT7

    Matriculador --> MAT1
    Matriculador --> MAT2
    Matriculador --> MAT3
    Matriculador --> MAT4
    Matriculador --> MAT5
    Matriculador --> MAT6
    Matriculador --> MAT7
```

---
Caso de Uso: MAT-CU01 - Seleccionar ciclo de trabajo
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     El usuario selecciona el ciclo academico activo sobre el cual
                 realizara las operaciones de matricula.
Precondicion:    El usuario ha iniciado sesion con rol Admin o Matriculador.
                 Existe al menos un ciclo creado en el sistema.
Postcondicion:   El sistema carga automaticamente el ultimo ciclo operable creado.
Flujo Principal:
  1. El usuario ingresa al modulo de Matricula.
  2. El sistema detecta el ciclo activo y lo carga automaticamente.
  3. El sistema muestra el nombre del ciclo seleccionado en la interfaz.
  4. El usuario puede cambiar de ciclo mediante un selector.
  5. El sistema actualiza la lista de estudiantes segun el ciclo seleccionado.
Flujo Alternativo (Sin ciclo operable):
  1.1. Si no existe un ciclo, el sistema muestra un mensaje y redirige a creacion.
Flujo Alternativo (Ciclo fuera de periodo):
  3.1. Si el ciclo esta fuera de su rango de fechas operable, el sistema
       bloquea las operaciones de escritura (no permite matricular, editar, etc.).

---
Caso de Uso: MAT-CU02 - Matricular nuevo estudiante
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Registra un nuevo estudiante en el sistema y lo matricula
                 en el ciclo activo, creando su ficha personal, academica y
                 de apoderado.
Precondicion:    Ciclo activo seleccionado y en periodo operable.
                 El DNI del estudiante no existe previamente en el sistema.
Postcondicion:   Se crea un User con StudentProfile y un CycleEnrollment
                 asociado al ciclo activo. Opcionalmente se crea un
                 PaymentAgreement si se registra pago inicial.
Flujo Principal:
  1. El usuario hace clic en "Nuevo Estudiante".
  2. El sistema muestra el formulario de registro.
  3. El usuario ingresa datos personales (DNI, nombres, apellidos, email).
  4. El usuario ingresa datos academicos (modalidad, grupo, turno).
  5. El usuario ingresa datos del apoderado (nombre, telefono).
  6. El sistema valida:
     - DNI de 8 digitos y unico
     - Email no duplicado en el ciclo
  7. El sistema crea: User + StudentProfile + CycleEnrollment.
  8. El sistema notifica exito y muestra el detalle del estudiante.
Flujo Alternativo (DNI duplicado en User):
  6.1. Si el DNI corresponde a un User existente, el sistema redirige a
       MAT-CU03 (Matricular estudiante recurrente).
Flujo Alternativo (Error de validacion):
  6.2. Si algun campo no es valido, el sistema muestra el error especifico
       y permite corregir.

---
Caso de Uso: MAT-CU03 - Matricular estudiante recurrente
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Re-matriicula a un estudiante ya existente en el sistema
                 en un nuevo ciclo, reutilizando su User y StudentProfile.
Precondicion:    Ciclo activo seleccionado y en periodo operable.
                 El User ya existe en el sistema (por DNI).
                 El User NO tiene un CycleEnrollment para el ciclo activo.
Postcondicion:   Se crea un CycleEnrollment para el usuario en el ciclo activo.
Flujo Principal:
  1. El usuario ingresa el DNI del estudiante existente.
  2. El sistema busca el User y muestra sus datos actuales.
  3. El usuario confirma la re-matricula.
  4. El sistema crea el CycleEnrollment.
  5. El sistema notifica exito.
Flujo Alternativo (Ya matriculado en este ciclo):
  2.1. Si el estudiante ya tiene CycleEnrollment para el ciclo activo,
       el sistema muestra error: "Estudiante ya matriculado en este ciclo".

---
Caso de Uso: MAT-CU04 - Editar estudiante matriculado
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Modifica datos personales, academicos o del apoderado
                 de un estudiante ya matriculado.
Precondicion:    Ciclo activo en periodo operable.
                 Estudiante existe y esta matriculado en el ciclo.
Postcondicion:   Se actualizan los campos modificados en User y StudentProfile.
Flujo Principal:
  1. El usuario busca al estudiante (por DNI, nombre o apellido).
  2. El sistema muestra los datos del estudiante en detalle.
  3. El usuario modifica los campos necesarios.
  4. El sistema valida los cambios.
  5. El sistema guarda los cambios y notifica exito.

---
Caso de Uso: MAT-CU05 - Consultar lista de matriculados
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Visualiza la lista de estudiantes matriculados en el ciclo
                 activo con opciones de busqueda y filtrado.
Precondicion:    Ciclo activo seleccionado.
Postcondicion:   Se carga y muestra la tabla de estudiantes.
Flujo Principal:
  1. El sistema carga los estudiantes del ciclo activo.
  2. El sistema muestra una tabla con columnas: DNI, nombres, apellidos,
     modalidad, grupo, estado, saldo/deuda.
  3. El usuario puede buscar por DNI, nombre o apellido.
  4. El sistema filtra la tabla en tiempo real mientras el usuario escribe.
Flujo Alternativo (Sin estudiantes):
  1.1. Si no hay estudiantes matriculados, el sistema muestra
       mensaje "No hay estudiantes matriculados en este ciclo".

---
Caso de Uso: MAT-CU06 - Visualizar detalle del estudiante
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Accede a la ficha completa del estudiante con toda su
                 informacion personal, academica, financiera y de apoderado.
Precondicion:    Estudiante existe en el sistema.
Postcondicion:   Se muestra la ficha completa del estudiante.
Flujo Principal:
  1. El usuario hace clic en un estudiante de la lista.
  2. El sistema muestra toda la informacion del estudiante.
  3. El sistema muestra acceso a acciones: editar, generar carnet,
     ver pagos, ver asistencia.

---
Caso de Uso: MAT-CU07 - Generar plancha de carnets
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Genera un PDF con carnets academicos en formato A4
                 para impresion, ya sea individual o masivo.
Precondicion:    Estudiante(s) seleccionado(s) existen en el sistema.
Postcondicion:   Se descarga un archivo PDF con los carnets generados.
Flujo Principal:
  1. El usuario selecciona uno o varios estudiantes de la lista.
  2. El usuario hace clic en "Generar plancha de carnets".
  3. El sistema genera un PDF con los carnets en formato A4.
  4. El sistema descarga el archivo PDF.
Flujo Alternativo (Carnet individual):
  1.1. Desde el detalle del estudiante, el usuario puede generar
       un carnet individual.
Flujo Alternativo (Sin estudiantes seleccionados):
  2.1. Si no hay estudiantes seleccionados, el sistema genera
       carnets de toda la lista visible.


====================================================================
MODULO: GESTION DE CICLOS (CIC)
====================================================================

### DIAGRAMA DE CASOS DE USO - GESTION DE CICLOS

```mermaid
usecaseDiagram
    actor Admin
    actor Matriculador

    usecase "CIC-CU01: Crear ciclo academico" as CIC1
    usecase "CIC-CU02: Seleccionar ciclo activo" as CIC2
    usecase "CIC-CU03: Validar disponibilidad operativa del ciclo" as CIC3

    Admin --> CIC1
    Admin --> CIC2
    Admin --> CIC3

    Matriculador --> CIC1
    Matriculador --> CIC2
    Matriculador --> CIC3
```

---
Caso de Uso: CIC-CU01 - Crear ciclo academico
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Crea un nuevo periodo academico con nombre, fecha de inicio
                 y fecha de fin.
Precondicion:    Usuario autenticado con rol Admin o Matriculador.
Postcondicion:   Se crea un nuevo registro Cycle en la base de datos.
Flujo Principal:
  1. El usuario accede a la opcion de crear ciclo.
  2. El sistema muestra formulario: nombre, fecha inicio, fecha fin.
  3. El usuario ingresa los datos.
  4. El sistema valida que el nombre sea unico.
  5. El sistema valida que fecha fin > fecha inicio.
  6. El sistema crea el ciclo y notifica exito.
Flujo Alternativo (Nombre duplicado):
  4.1. Si el nombre ya existe, el sistema muestra error.

---
Caso de Uso: CIC-CU02 - Seleccionar ciclo activo
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Define cual ciclo se usara como contexto para las
                 operaciones del sistema.
Precondicion:    Existe al menos un ciclo creado.
Postcondicion:   El ciclo seleccionado queda como activo en la sesion.
Flujo Principal:
  1. El usuario abre el selector de ciclos.
  2. El sistema muestra la lista de ciclos disponibles.
  3. El usuario selecciona un ciclo.
  4. El sistema guarda la seleccion como ciclo activo.
Flujo Alternativo (Ciclo terminado):
  2.1. El sistema indica visualmente cuales ciclos estan fuera de periodo.
  3.1. Si el usuario selecciona un ciclo terminado, el sistema bloquea
       operaciones de escritura.

---
Caso de Uso: CIC-CU03 - Validar disponibilidad operativa del ciclo
-----------------------------------------------------
Actores:         Sistema (transversal)
Descripcion:     Verifica si el ciclo activo esta dentro de su rango de
                 fechas operables antes de permitir operaciones de escritura.
Precondicion:    Hay un ciclo activo seleccionado.
Postcondicion:   Se permite o bloquea la operacion solicitada.
Flujo Principal:
  1. El usuario intenta realizar una operacion (matricular, pagar, etc.).
  2. El sistema verifica la fecha actual contra el rango del ciclo.
  3. Si esta en periodo, permite la operacion.
Flujo Alternativo (Fuera de periodo):
  3.1. Si la fecha actual esta fuera del rango, el sistema bloquea
       la operacion y muestra mensaje: "Ciclo fuera de periodo operativo".


====================================================================
MODULO: PAGOS (PAG)
====================================================================

### DIAGRAMA DE CASOS DE USO - PAGOS

```mermaid
usecaseDiagram
    actor Admin
    actor Matriculador

    usecase "PAG-CU01: Buscar estudiante para pago" as PAG1
    usecase "PAG-CU02: Registrar pago" as PAG2
    usecase "PAG-CU03: Consultar historial de pagos" as PAG3
    usecase "PAG-CU04: Retirar estudiante" as PAG4
    usecase "PAG-CU05: Reactivar estudiante" as PAG5

    Admin --> PAG1
    Admin --> PAG2
    Admin --> PAG3
    Admin --> PAG4
    Admin --> PAG5

    Matriculador --> PAG1
    Matriculador --> PAG2
    Matriculador --> PAG3
    Matriculador --> PAG4
    Matriculador --> PAG5
```

---
Caso de Uso: PAG-CU01 - Buscar estudiante para pago
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Localiza a un estudiante por DNI para consultar o
                 gestionar su situacion financiera.
Precondicion:    Ciclo activo seleccionado.
Postcondicion:   Se muestra el resumen financiero del estudiante.
Flujo Principal:
  1. El usuario ingresa DNI del estudiante en el campo de busqueda.
  2. El sistema busca al estudiante en el ciclo activo.
  3. El sistema muestra el resumen financiero: monto total, inicial,
     saldo pendiente, tipo de acuerdo, cuotas de referencia.
Flujo Alternativo (Estudiante no encontrado):
  2.1. Si el DNI no corresponde a un estudiante en el ciclo activo,
       el sistema muestra "Estudiante no encontrado en este ciclo".

---
Caso de Uso: PAG-CU02 - Registrar pago
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Registra un pago realizado por el estudiante, actualizando
                 su saldo pendiente y las cuotas correspondientes.
Precondicion:    Estudiante con PaymentAgreement activo en el ciclo.
                 Ciclo activo en periodo operable.
Postcondicion:   Se crea un PaymentTransaction, se actualiza el saldo
                 pendiente y se marcan cuotas como PAID segun el monto.
Flujo Principal:
  1. El usuario busca al estudiante (PAG-CU01).
  2. El sistema muestra el resumen financiero.
  3. El usuario selecciona "Registrar pago".
  4. El usuario ingresa monto a pagar.
  5. El usuario ingresa numero de recibo.
  6. El sistema autocompleta el recibo a 8 digitos.
  7. El usuario selecciona tipo de pago: INICIAL o REGULAR.
  8. El sistema valida que el monto sea positivo.
  9. El sistema registra el PaymentTransaction.
  10. El sistema actualiza currentPendingAmount (resta el monto).
  11. El sistema actualiza las cuotas PENDING a PAID segun corresponda.
  12. El sistema muestra el comprobante de pago.
Flujo Alternativo (Estudiante retirado):
  8.1. El sistema permite registrar pagos incluso si el estudiante
       esta en estado RETIRED.
Flujo Alternativo (Pago inicial desde matricula):
  3.1. Desde el flujo de matricula, se puede registrar el pago inicial
       directamente sin pasar por el modulo de pagos.

---
Caso de Uso: PAG-CU03 - Consultar historial de pagos
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Visualiza el historial completo de transacciones
                 realizadas por un estudiante en el ciclo activo.
Precondicion:    Estudiante seleccionado con PaymentAgreement.
Postcondicion:   Se muestra la lista de transacciones.
Flujo Principal:
  1. El usuario busca al estudiante (PAG-CU01).
  2. El sistema muestra el resumen financiero.
  3. El usuario navega a "Historial de pagos".
  4. El sistema muestra la lista de PaymentTransactions ordenadas
     por fecha descendente con: fecha, monto, recibo, tipo.

---
Caso de Uso: PAG-CU04 - Retirar estudiante
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Cambia el estado del estudiante a RETIRED en el ciclo
                 activo, manteniendo su historial de pagos.
Precondicion:    Estudiante activo en el ciclo activo.
Postcondicion:   User.status cambia a RETIRED.
Flujo Principal:
  1. El usuario busca al estudiante (PAG-CU01).
  2. El usuario selecciona "Retirar estudiante".
  3. El sistema solicita confirmacion.
  4. El usuario confirma.
  5. El sistema cambia User.status a RETIRED.
  6. El sistema notifica exito.
Flujo Alternativo (Ya retirado):
  2.1. Si el estudiante ya esta RETIRED, la opcion no esta disponible.

---
Caso de Uso: PAG-CU05 - Reactivar estudiante
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Cambia el estado del estudiante de RETIRED a ACTIVE.
Precondicion:    Estudiante en estado RETIRED en el ciclo activo.
Postcondicion:   User.status cambia a ACTIVE.
Flujo Principal:
  1. El usuario busca al estudiante (PAG-CU01).
  2. El usuario selecciona "Reactivar estudiante".
  3. El sistema solicita confirmacion.
  4. El usuario confirma.
  5. El sistema cambia User.status a ACTIVE.


====================================================================
MODULO: USUARIOS (USR)
====================================================================

### DIAGRAMA DE CASOS DE USO - USUARIOS

```mermaid
usecaseDiagram
    actor Admin
    actor Matriculador

    usecase "USR-CU01: Consultar estudiantes por ciclo" as USR1
    usecase "USR-CU02: Filtrar estudiantes con deuda" as USR2
    usecase "USR-CU03: Consultar estado y datos academicos" as USR3

    Admin --> USR1
    Admin --> USR2
    Admin --> USR3

    Matriculador --> USR1
    Matriculador --> USR2
    Matriculador --> USR3
```

---
Caso de Uso: USR-CU01 - Consultar estudiantes por ciclo
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Visualiza y filtra la lista de estudiantes del ciclo
                 activo con multiples criterios de busqueda.
Precondicion:    Ciclo activo seleccionado.
Postcondicion:   Se muestra la tabla filtrada de estudiantes.
Flujo Principal:
  1. El usuario ingresa al modulo Usuarios.
  2. El sistema carga los estudiantes del ciclo activo.
  3. El sistema muestra la tabla con columnas: ciclo, modalidad,
     grupo, DNI, nombres, apellidos, estado, saldo/deuda.
  4. El usuario puede aplicar filtros por: modalidad, grupo, DNI,
     nombres, apellidos, estado, deuda.
  5. El sistema actualiza la tabla segun los filtros aplicados.
Flujo Alternativo (Sin resultados):
  5.1. Si ningun estudiante coincide, muestra "No se encontraron resultados".

---
Caso de Uso: USR-CU02 - Filtrar estudiantes con deuda
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Aplica un filtro rapido para identificar estudiantes
                 que tienen saldo pendiente mayor a cero.
Precondicion:    Lista de estudiantes cargada.
Postcondicion:   La tabla muestra solo estudiantes con deuda > 0.
Flujo Principal:
  1. El usuario activa el filtro "Con deuda".
  2. El sistema filtra estudiantes cuyo currentPendingAmount > 0.
  3. El sistema resalta visualmente las celdas de deuda.

---
Caso de Uso: USR-CU03 - Consultar estado y datos academicos
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Accede al detalle academico completo de un estudiante
                 desde la tabla de usuarios.
Precondicion:    Estudiante existe en el sistema.
Postcondicion:   Se muestra la ficha academica del estudiante.
Flujo Principal:
  1. El usuario hace clic en un estudiante de la tabla.
  2. El sistema muestra: datos personales, academicos, estado actual,
     saldo, y acciones disponibles.


====================================================================
MODULO: ASISTENCIA ADMINISTRATIVA (ASIS)
====================================================================

### DIAGRAMA DE CASOS DE USO - ASISTENCIA ADMINISTRATIVA

```mermaid
usecaseDiagram
    actor Admin
    actor Matriculador

    usecase "ASIS-CU01: Iniciar sesion de asistencia" as ASIS1
    usecase "ASIS-CU02: Registrar presente" as ASIS2
    usecase "ASIS-CU03: Registrar tardanza" as ASIS3
    usecase "ASIS-CU04: Finalizar sesion" as ASIS4
    usecase "ASIS-CU05: Consultar historial de sesion" as ASIS5
    usecase "ASIS-CU06: Consultar historial de asistencia de alumno" as ASIS6

    Admin --> ASIS1
    Admin --> ASIS2
    Admin --> ASIS3
    Admin --> ASIS4
    Admin --> ASIS5
    Admin --> ASIS6

    Matriculador --> ASIS1
    Matriculador --> ASIS2
    Matriculador --> ASIS3
    Matriculador --> ASIS4
    Matriculador --> ASIS5
    Matriculador --> ASIS6
```

---
Caso de Uso: ASIS-CU01 - Iniciar sesion de asistencia
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Crea una nueva sesion de asistencia para comenzar a
                 registrar la presencia de estudiantes.
Precondicion:    Ciclo activo seleccionado.
                 No hay otra sesion activa en el mismo horario.
Postcondicion:   Se crea un AttendanceSession con estado en curso.
Flujo Principal:
  1. El usuario ingresa al modulo Asistencia.
  2. El sistema verifica si hay una sesion en curso.
  3. El usuario selecciona "Nueva sesion".
  4. El sistema crea la AttendanceSession con hora de inicio actual.
  5. El sistema carga la lista de estudiantes del ciclo activo.
  6. El sistema muestra la interfaz de marcacion: dos listas
     ("Faltan por marcar" y "Ya marcaron").
Flujo Alternativo (Sesion en curso existente):
  2.1. Si hay una sesion activa, el sistema pregunta si desea
       continuar la sesion existente o finalizarla primero.

---
Caso de Uso: ASIS-CU02 - Registrar presente
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Marca la asistencia de un estudiante como PRESENTE
                 mediante escaneo de QR o registro manual.
Precondicion:    Sesion de asistencia activa.
                 Estudiante visible en la lista "Faltan por marcar".
Postcondicion:   Se crea un AttendanceRecord con status PRESENT.
                 El estudiante pasa a la lista "Ya marcaron".
Flujo Principal:
  1. El usuario escanea el QR del estudiante con la camara.
  2. El sistema decodifica el QR y obtiene el ID del estudiante.
  3. El sistema registra AttendanceRecord con status PRESENT.
  4. El sistema reproduce un sonido de exito.
  5. El sistema mueve al estudiante de "Faltan" a "Ya marcaron".
Flujo Alternativo (Registro manual):
  1.1. El usuario busca al estudiante por DNI/nombre y hace clic
       en "Marcar presente".
Flujo Alternativo (QR invalido):
  2.1. Si el QR no corresponde a un estudiante valido, el sistema
       muestra error y no registra.

---
Caso de Uso: ASIS-CU03 - Registrar tardanza
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Cambia el estado de un registro recien creado de
                 PRESENT a LATE (tardanza).
Precondicion:    El estudiante acaba de ser marcado como PRESENTE.
Postcondicion:   El AttendanceRecord cambia status de PRESENT a LATE.
Flujo Principal:
  1. El usuario activa el modo "Registro de tardanzas".
  2. El sistema habilita el cambio de estado para nuevos registros.
  3. Cuando un estudiante es marcado, aparece automaticamente como
     TARDANZA en lugar de PRESENTE.
  4. El sistema reproduce sonido indicando tardanza.
Flujo Alternativo (Cambio manual):
  3.1. El usuario puede cambiar manualmente un registro PRESENT a LATE
       desde la lista "Ya marcaron".

---
Caso de Uso: ASIS-CU04 - Finalizar sesion
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Cierra la sesion de asistencia y marca automaticamente
                 como AUSENTE a los estudiantes no registrados.
Precondicion:    Sesion de asistencia activa.
Postcondicion:   Sesion finalizada. Estudiantes sin marcar quedan como
                 ABSENT. No se permiten mas registros en esta sesion.
Flujo Principal:
  1. El usuario selecciona "Finalizar sesion".
  2. El sistema solicita confirmacion.
  3. El usuario confirma.
  4. El sistema marca a todos los estudiantes en "Faltan por marcar"
     con status ABSENT.
  5. El sistema cierra la sesion (actualiza endTime).
  6. El sistema notifica: "Sesion finalizada. N ausentes registrados."

---
Caso de Uso: ASIS-CU05 - Consultar historial de sesion
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Visualiza los registros de una sesion de asistencia
                 ya finalizada.
Precondicion:    Sesion finalizada existe en el sistema.
Postcondicion:   Se muestra el detalle de la sesion.
Flujo Principal:
  1. El usuario selecciona una sesion del historial.
  2. El sistema muestra la lista de registros con: nombre, DNI,
     hora de marcacion y estado (PRESENT/LATE/ABSENT).
  3. El sistema muestra estadisticas: total, presentes, tardanzas, ausentes.

---
Caso de Uso: ASIS-CU06 - Consultar historial de asistencia de un alumno
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Visualiza el historial completo de asistencia de un
                 estudiante especifico a traves de todas las sesiones.
Precondicion:    Estudiante existe en el sistema.
Postcondicion:   Se muestra el historial del estudiante.
Flujo Principal:
  1. El usuario selecciona la opcion "Historial de alumno".
  2. El usuario busca al estudiante por DNI.
  3. El sistema muestra todas las sesiones con su estado en cada una:
     PRESENTE / TARDANZA / FALTA.
  4. El sistema muestra resumen: % de asistencia.


====================================================================
MODULO: HISTORIAL PERSONAL DE ASISTENCIA (HPA)
====================================================================

### DIAGRAMA DE CASOS DE USO - HISTORIAL PERSONAL DE ASISTENCIA

```mermaid
usecaseDiagram
    actor Estudiante

    usecase "HPA-CU01: Consultar mis asistencias" as HPA1
    usecase "HPA-CU02: Revisar detalle de mis registros por sesion" as HPA2

    Estudiante --> HPA1
    Estudiante --> HPA2
```

---
Caso de Uso: HPA-CU01 - Consultar mis asistencias
-----------------------------------------------------
Actores:         Estudiante
Descripcion:     El estudiante consulta su propio historial cronologico
                 de asistencia a sesiones.
Precondicion:    Estudiante autenticado en el sistema.
Postcondicion:   Se muestra el historial de asistencia personal.
Flujo Principal:
  1. El estudiante ingresa a "Mis Asistencias" desde el sidebar.
  2. El sistema carga los registros de asistencia del estudiante.
  3. El sistema muestra las sesiones ordenadas por fecha descendente.
  4. Cada registro muestra: nombre de sesion, fecha, hora, estado
     (PRESENTE / TARDANZA / FALTA).
Flujo Alternativo (Sin registros):
  2.1. Si no hay registros, muestra "No tienes registros de asistencia".

---
Caso de Uso: HPA-CU02 - Revisar detalle de mis registros por sesion
-----------------------------------------------------
Actores:         Estudiante
Descripcion:     El estudiante revisa en detalle su registro en una
                 sesion especifica de asistencia.
Precondicion:    Estudiante autenticado. Existe al menos un registro.
Postcondicion:   Se muestra el detalle de la sesion seleccionada.
Flujo Principal:
  1. El estudiante hace clic en una sesion del listado.
  2. El sistema muestra el detalle: nombre completo de sesion,
     fecha, hora exacta de marcacion, estado.


====================================================================
MODULO: SIMULACROS (SIM)
====================================================================

### DIAGRAMA DE CASOS DE USO - SIMULACROS

```mermaid
usecaseDiagram
    actor Admin
    actor Matriculador

    usecase "SIM-CU01: Crear evento de simulacro" as SIM1
    usecase "SIM-CU02: Subir archivo de resultados" as SIM2
    usecase "SIM-CU03: Validar codigos de estudiantes" as SIM3
    usecase "SIM-CU04: Ingresar respuestas correctas" as SIM4
    usecase "SIM-CU05: Procesar resultados" as SIM5
    usecase "SIM-CU06: Visualizar resultados" as SIM6
    usecase "SIM-CU07: Exportar resultados a Excel" as SIM7
    usecase "SIM-CU08: Eliminar evento" as SIM8
    usecase "SIM-CU09: Importar resultados pre-procesados" as SIM9

    Admin --> SIM1
    Admin --> SIM2
    Admin --> SIM3
    Admin --> SIM4
    Admin --> SIM5
    Admin --> SIM6
    Admin --> SIM7
    Admin --> SIM8
    Admin --> SIM9

    Matriculador --> SIM1
    Matriculador --> SIM2
    Matriculador --> SIM3
    Matriculador --> SIM4
    Matriculador --> SIM5
    Matriculador --> SIM6
    Matriculador --> SIM7
    Matriculador --> SIM9
```

---
Caso de Uso: SIM-CU01 - Crear evento de simulacro
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Define un nuevo evento de simulacro con nombre,
                 numero de preguntas, modalidades participantes y
                 separacion tematica opcional.
Precondicion:    Usuario autenticado con rol Admin o Matriculador.
                 Existen AcademicModalities creadas.
Postcondicion:   Se crea un SimulationEvent con sus modalidades asociadas.
Flujo Principal:
  1. El usuario ingresa al modulo Simulacros.
  2. El usuario selecciona "Crear evento".
  3. El sistema muestra el formulario de creacion.
  4. El usuario ingresa nombre del evento.
  5. El usuario selecciona el numero total de preguntas.
  6. El usuario selecciona una o mas modalidades participantes.
  7. Opcionalmente, define separacion tematica
     (tema, pregunta inicial, pregunta final).
  8. El usuario confirma la creacion.
  9. El sistema crea el SimulationEvent + SimulationEventModalities.
  10. El sistema notifica exito y muestra el evento en la lista.
Flujo Alternativo (Sin nombre): muestra error.
Flujo Alternativo (Sin modalidades): muestra error.

---
Caso de Uso: SIM-CU02 - Subir archivo de resultados
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Sube un archivo Excel con las respuestas de los
                 estudiantes para un evento de simulacro.
Precondicion:    Evento de simulacro creado. Ciclo activo seleccionado.
Postcondicion:   Se crea un SimulationInstance. El archivo se almacena
                 en el servidor. Se inicia el proceso de validacion.
Flujo Principal:
  1. El usuario selecciona un evento de la lista.
  2. El usuario hace clic en "Subir resultados".
  3. El usuario ingresa un nombre para la instancia.
  4. El usuario selecciona el archivo Excel (.xlsx).
  5. El sistema extrae los codigos de estudiantes (columna A).
  6. El sistema envia el archivo al backend y crea SimulationInstance.
  7. El sistema envia los codigos al endpoint de validacion.
Flujo Alternativo (Sin ciclo activo): bloquea la subida.
Flujo Alternativo (Archivo invalido): muestra error.

---
Caso de Uso: SIM-CU03 - Validar codigos de estudiantes
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Verifica que los codigos (DNI) de estudiantes en el
                 Excel correspondan a usuarios reales, activos, de la
                 modalidad correcta y matriculados en el ciclo.
Precondicion:    SimulationInstance creada con archivo subido.
Postcondicion:   Se muestra un reporte de coincidencias y no coincidencias.
Flujo Principal:
  1. El backend consulta la BD por cada codigo.
  2. El sistema valida: User existe, status ACTIVE,
     StudentProfile.modality coincide, CycleEnrollment existe.
  3. El sistema retorna un array de {codigo, encontrado: bool}.
  4. El usuario visualiza la tabla con resultados de validacion,
     verdes (encontrados) y rojos (no encontrados).
Flujo Alternativo (Todos validos): habilita el boton de procesamiento.

---
Caso de Uso: SIM-CU04 - Ingresar respuestas correctas
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Define la clave de respuestas correctas para el
                 evento de simulacro.
Precondicion:    Evento de simulacro creado con totalQuestions definido.
Postcondicion:   Se guarda el answerKey en el SimulationEvent.
Flujo Principal:
  1. El usuario abre la interfaz de clave de respuestas.
  2. El sistema muestra un grid con preguntas numeradas (1..N).
  3. Para cada pregunta, el usuario selecciona A/B/C/D/E.
  4. El usuario guarda la clave.
  5. El sistema actualiza SimulationEvent.answerKey.
Flujo Alternativo (Clave existente): precarga permitiendo edicion.

---
Caso de Uso: SIM-CU05 - Procesar resultados
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Ejecuta el calculo de puntajes y ranking para todos
                 los estudiantes del archivo subido.
Precondicion:    SimulationInstance creada. AnswerKey definida.
Postcondicion:   Se crean SimulationResult con puntaje total,
                 puntaje por segmento y ranking.
Flujo Principal:
  1. El usuario confirma el procesamiento.
  2. El sistema lee el Excel fila por fila.
  3. Por cada estudiante: compara respuestas contra answerKey
     (acierto +4, error -1, vacio 0) y agrupa por segmento.
  4. El sistema guarda los resultados en transaccion.
  5. El sistema calcula el ranking por totalScore DESC.
  6. El sistema notifica y redirige a resultados.
Flujo Alternativo (Sin answerKey): solicita ingresar clave primero.
Flujo Alternativo (Sin estudiantes validos): omite con warning.

---
Caso de Uso: SIM-CU06 - Visualizar resultados
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Muestra la tabla de resultados procesados con puntajes
                 totales, desglose por segmento y ranking.
Precondicion:    SimulationInstance procesada exitosamente.
Postcondicion:   Se muestra la tabla de resultados.
Flujo Principal:
  1. El sistema carga los resultados de la instancia.
  2. El sistema muestra tabla con columnas: nombre, DNI, puntaje total,
     puntajes por segmento (columnas dinamicas), puesto/ranking.
  3. El usuario puede ordenar por cualquier columna.

---
Caso de Uso: SIM-CU07 - Exportar resultados a Excel
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Descarga los resultados procesados en formato Excel.
Precondicion:    Resultados procesados y visibles.
Postcondicion:   Se descarga un archivo Excel con los resultados.
Flujo Principal:
  1. El usuario hace clic en "Exportar a Excel".
  2. El sistema genera y descarga el archivo Excel.

---
Caso de Uso: SIM-CU08 - Eliminar evento de simulacro
-----------------------------------------------------
Actores:         Admin
Descripcion:     Elimina un evento de simulacro y todas sus instancias
                 y resultados asociados.
Precondicion:    Evento existe. Usuario con rol Admin.
Postcondicion:   Se eliminan: SimulationEvent, instancias y resultados.
Flujo Principal:
  1. El usuario selecciona eliminar un evento.
  2. El sistema solicita confirmacion.
  3. El usuario confirma.
  4. El sistema elimina en cascada.
  5. El sistema notifica exito.

---
Caso de Uso: SIM-CU09 - Importar resultados pre-procesados
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Importa resultados que ya vienen calculados desde el
                 Excel (con puntajes finales).
Precondicion:    Evento de simulacro existe. Excel con formato correcto.
Postcondicion:   Se crean SimulationResult con los puntajes del Excel.
Flujo Principal:
  1. El usuario selecciona "Importar Procesado".
  2. El sistema recibe el archivo Excel.
  3. El sistema valida encabezados: codigo, nombres, apellidos, puntaje.
  4. El sistema procesa fila por fila: valida codigos, detecta duplicados.
  5. El sistema crea los resultados en transaccion.
  6. El sistema calcula ranking.
  7. El sistema muestra resumen de la importacion.


====================================================================
MODULO: RESULTADOS DEL ESTUDIANTE (RES)
====================================================================

### DIAGRAMA DE CASOS DE USO - RESULTADOS DEL ESTUDIANTE

```mermaid
usecaseDiagram
    actor Estudiante

    usecase "RES-CU01: Consultar mis resultados de simulacros" as RES1

    Estudiante --> RES1
```

---
Caso de Uso: RES-CU01 - Consultar mis resultados de simulacros
-----------------------------------------------------
Actores:         Estudiante
Descripcion:     El estudiante visualiza sus resultados personales
                 en los simulacros procesados.
Precondicion:    Estudiante autenticado. Existen SimulationResult
                 asociados a su usuario.
Postcondicion:   Se muestra el historial de resultados del estudiante.
Flujo Principal:
  1. El estudiante ingresa a "Mis Resultados" desde el sidebar.
  2. El sistema busca SimulationResult donde studentId = usuario actual.
  3. El sistema muestra: nombre del evento, fecha, puntaje total, ranking.
  4. El sistema ordena por fecha descendente.
Flujo Alternativo (Sin resultados): "Aun no tienes resultados registrados".


====================================================================
MODULO: MATERIAL DE CURSOS (MATL)
====================================================================

### DIAGRAMA DE CASOS DE USO - MATERIAL DE CURSOS

```mermaid
usecaseDiagram
    actor Admin
    actor Matriculador
    actor Estudiante

    usecase "MATL-CU01: Crear curso" as MATL1
    usecase "MATL-CU02: Editar curso" as MATL2
    usecase "MATL-CU03: Eliminar curso" as MATL3
    usecase "MATL-CU04: Subir material a curso" as MATL4
    usecase "MATL-CU05: Editar material" as MATL5
    usecase "MATL-CU06: Eliminar material" as MATL6
    usecase "MATL-CU07: Consultar material disponible" as MATL7
    usecase "MATL-CU08: Descargar material" as MATL8
    usecase "MATL-CU09: Previsualizar PDF" as MATL9

    Admin --> MATL1
    Admin --> MATL2
    Admin --> MATL3
    Admin --> MATL4
    Admin --> MATL5
    Admin --> MATL6
    Admin --> MATL7
    Admin --> MATL8

    Matriculador --> MATL1
    Matriculador --> MATL2
    Matriculador --> MATL3
    Matriculador --> MATL4
    Matriculador --> MATL5
    Matriculador --> MATL6
    Matriculador --> MATL7
    Matriculador --> MATL8

    Estudiante --> MATL7
    Estudiante --> MATL8
    Estudiante --> MATL9
```

---
Caso de Uso: MATL-CU01 - Crear curso
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Crea un nuevo curso con nombre, descripcion, imagen
                 de portada y modalidades asociadas.
Precondicion:    Usuario autenticado con rol Admin o Matriculador.
Postcondicion:   Se crea un Course con sus CourseModality asociadas.
Flujo Principal:
  1. El usuario ingresa al modulo de Cursos/Materiales.
  2. El usuario selecciona "Crear curso".
  3. El usuario ingresa: nombre, codigo unico, descripcion.
  4. El usuario selecciona las modalidades del curso.
  5. Opcionalmente, sube una imagen de portada.
  6. El sistema valida que el codigo sea unico.
  7. El sistema crea el Course + CourseModality(s).
Flujo Alternativo (Codigo duplicado): muestra error.

---
Caso de Uso: MATL-CU02 - Editar curso
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Modifica los datos de un curso existente.
Precondicion:    Curso existe en el sistema.
Postcondicion:   Se actualizan los campos del curso.
Flujo Principal:
  1. El usuario selecciona un curso.
  2. Hace clic en "Editar".
  3. El sistema muestra formulario precargado.
  4. El usuario modifica los campos.
  5. El sistema guarda los cambios.

---
Caso de Uso: MATL-CU03 - Eliminar curso
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Elimina un curso y sus materiales asociados.
Precondicion:    Curso existe. Usuario con permisos.
Postcondicion:   Se elimina el curso y sus archivos.
Flujo Principal:
  1. El usuario selecciona eliminar un curso.
  2. El sistema solicita confirmacion.
  3. El usuario confirma.
  4. El sistema elimina el curso y sus materiales.

---
Caso de Uso: MATL-CU04 - Subir material a curso
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Sube un archivo como material educativo.
Precondicion:    Curso existe en el sistema.
Postcondicion:   Se crea un registro File asociado al curso.
Flujo Principal:
  1. El usuario selecciona un curso.
  2. Hace clic en "Subir material".
  3. Selecciona archivo, ingresa nombre, descripcion, tipo de recurso.
  4. El sistema almacena el archivo y crea el registro File.

---
Caso de Uso: MATL-CU05 - Editar material
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Modifica los metadatos de un material subido.
Precondicion:    File existe en el sistema.
Postcondicion:   Se actualizan los metadatos del material.
Flujo Principal:
  1. Selecciona material.
  2. Modifica nombre, descripcion, etc.
  3. Guarda cambios.

---
Caso de Uso: MATL-CU06 - Eliminar material
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Elimina un material y su archivo del disco.
Precondicion:    File existe. Usuario con permisos.
Postcondicion:   Se elimina File y archivo fisico.
Flujo Principal:
  1. Selecciona eliminar material.
  2. Confirma.
  3. Sistema elimina.

---
Caso de Uso: MATL-CU07 - Consultar material disponible
-----------------------------------------------------
Actores:         Admin, Matriculador, Estudiante
Descripcion:     Visualiza cursos y materiales segun la modalidad.
Precondicion:    Usuario autenticado.
Postcondicion:   Se muestra lista de cursos con sus materiales.
Flujo Principal:
  1. Usuario ingresa a "Material de Cursos".
  2. Admin/Matriculador: ven todos los cursos.
     Estudiante: solo ve cursos de su modalidad.
Flujo Alternativo (Estudiante sin modalidad): no ve ningun curso.

---
Caso de Uso: MATL-CU08 - Descargar material
-----------------------------------------------------
Actores:         Admin, Matriculador, Estudiante
Descripcion:     Descarga un archivo de material educativo.
Precondicion:    File existe. Usuario tiene permiso de acceso.
Postcondicion:   Se descarga el archivo.
Flujo Principal:
  1. Usuario hace clic en un material.
  2. Sistema verifica permisos.
  3. Sistema descarga el archivo.

---
Caso de Uso: MATL-CU09 - Previsualizar PDF
-----------------------------------------------------
Actores:         Estudiante
Descripcion:     Visualiza PDF en el navegador sin descargar.
Precondicion:    File es PDF. Estudiante tiene permiso.
Postcondicion:   Se muestra el PDF en visor integrado.
Flujo Principal:
  1. Estudiante hace clic en "Previsualizar".
  2. Sistema abre visor de PDF en la pagina.


====================================================================
MODULO: PERFIL (PRF)
====================================================================

### DIAGRAMA DE CASOS DE USO - PERFIL

```mermaid
usecaseDiagram
    actor Estudiante

    usecase "PRF-CU01: Consultar perfil personal" as PRF1
    usecase "PRF-CU02: Mostrar QR de asistencia" as PRF2
    usecase "PRF-CU03: Consultar historial de asistencia desde Perfil" as PRF3

    Estudiante --> PRF1
    Estudiante --> PRF2
    Estudiante --> PRF3
```

---
Caso de Uso: PRF-CU01 - Consultar perfil personal
-----------------------------------------------------
Actores:         Estudiante
Descripcion:     Visualiza sus datos personales, academicos, foto
                 de perfil y ciclo actual.
Precondicion:    Estudiante autenticado.
Postcondicion:   Se muestra la pagina de perfil del estudiante.
Flujo Principal:
  1. Estudiante ingresa a "Mi Perfil".
  2. Sistema carga: nombre, DNI, email, modalidad, grupo, ciclo.
  3. Sistema muestra foto de perfil, QR personal, historial asistencia.

---
Caso de Uso: PRF-CU02 - Mostrar QR de asistencia
-----------------------------------------------------
Actores:         Estudiante
Descripcion:     Visualiza y amplia el QR para marcar asistencia.
Precondicion:    Estudiante autenticado.
Postcondicion:   Se muestra el QR en pantalla.
Flujo Principal:
  1. Estudiante accede a su perfil.
  2. Sistema genera y muestra QR con ID del estudiante.
  3. Estudiante puede hacer clic para ampliar.

---
Caso de Uso: PRF-CU03 - Consultar historial de asistencia desde Perfil
-----------------------------------------------------
Actores:         Estudiante
Descripcion:     Visualiza historial de asistencia integrado en perfil.
Precondicion:    Estudiante autenticado.
Postcondicion:   Se muestra el historial de asistencia.
Flujo Principal:
  1. Estudiante en su perfil.
  2. Sistema carga ultimos registros de asistencia.
Flujo Alternativo (Ver completo): enlace a HPA-CU01.


====================================================================
MODULO: CARNETS ACADEMICOS (CAR)
====================================================================

### DIAGRAMA DE CASOS DE USO - CARNETS ACADEMICOS

```mermaid
usecaseDiagram
    actor Admin
    actor Matriculador

    usecase "CAR-CU01: Generar carnet individual" as CAR1
    usecase "CAR-CU02: Generar plancha masiva de carnets" as CAR2

    Admin --> CAR1
    Admin --> CAR2
    Matriculador --> CAR1
    Matriculador --> CAR2
```

---
Caso de Uso: CAR-CU01 - Generar carnet individual
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Genera PDF de carnet academico para un estudiante.
Precondicion:    Estudiante existe en el sistema.
Postcondicion:   Se descarga PDF con el carnet.
Flujo Principal:
  1. Usuario accede al detalle del estudiante.
  2. Hace clic en "Generar carnet".
  3. Sistema genera PDF con datos, foto y QR.
  4. Sistema descarga el PDF.

---
Caso de Uso: CAR-CU02 - Generar plancha masiva de carnets
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Genera PDF con multiples carnets en A4 (8 por hoja).
Precondicion:    Lista de estudiantes disponible.
Postcondicion:   Se descarga PDF con plancha de carnets.
Flujo Principal:
  1. Usuario visualiza lista de estudiantes.
  2. Selecciona "Generar plancha de carnets".
  3. Sistema genera PDF con 8 carnets por hoja A4.
  4. Incluye frente y reverso para impresion duplex.
  5. Sistema descarga el PDF.


====================================================================
MODULO: IMPORTACION MASIVA POR EXCEL (IMP)
====================================================================

### DIAGRAMA DE CASOS DE USO - IMPORTACION MASIVA

```mermaid
usecaseDiagram
    actor Admin
    actor Matriculador

    usecase "IMP-CU01: Subir y validar archivo Excel" as IMP1
    usecase "IMP-CU02: Confirmar importacion masiva" as IMP2

    Admin --> IMP1
    Admin --> IMP2
    Matriculador --> IMP1
    Matriculador --> IMP2
```

---
Caso de Uso: IMP-CU01 - Subir y validar archivo Excel
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Sube Excel con datos de estudiantes y valida fila
                 por fila antes de la importacion definitiva.
Precondicion:    Ciclo activo en periodo operable.
Postcondicion:   Se muestra preview: validas, errores, recurrentes.
Flujo Principal:
  1. Usuario abre modal de importacion masiva.
  2. Selecciona y sube archivo Excel.
  3. Backend valida encabezados.
  4. Backend procesa fila por fila: DNI, email, modalidad, grupo,
     turno, pagos, duplicados, recurrentes.
  5. Sistema retorna preview: validas (verde), errores (rojo),
     recurrentes (amarillo).
Flujo Alternativo (Encabezados invalidos): muestra error.

---
Caso de Uso: IMP-CU02 - Confirmar importacion masiva
-----------------------------------------------------
Actores:         Admin, Matriculador
Descripcion:     Confirma importacion definitiva de filas validas.
Precondicion:    Preview con al menos una fila valida.
Postcondicion:   Se crean en transaccion: Users, StudentProfiles,
                 CycleEnrollments, PaymentAgreements.
Flujo Principal:
  1. Usuario revisa preview.
  2. Usuario confirma importacion.
  3. Backend ejecuta transaccion: crea Users, perfiles,
     matriculas y acuerdos de pago.
  4. Sistema muestra resumen: N estudiantes importados.
Flujo Alternativo (Error en transaccion): revierte todos los cambios.
Flujo Alternativo (Usuario cancela): no modifica BD.


====================================================================
RESUMEN DE CASOS DE USO POR MODULO
====================================================================

MODULO                    | ID       | CASOS DE USO
--------------------------|----------|------------------------------------------------------
Matricula                | MAT      | 7 (MAT-CU01 al MAT-CU07)
Gestion de Ciclos        | CIC      | 3 (CIC-CU01 al CIC-CU03)
Pagos                    | PAG      | 5 (PAG-CU01 al PAG-CU05)
Usuarios                 | USR      | 3 (USR-CU01 al USR-CU03)
Asistencia Administrativa| ASIS     | 6 (ASIS-CU01 al ASIS-CU06)
Historial Personal Asis. | HPA      | 2 (HPA-CU01 al HPA-CU02)
Simulacros               | SIM      | 9 (SIM-CU01 al SIM-CU09)
Resultados Estudiante    | RES      | 1 (RES-CU01)
Material de Cursos       | MATL     | 9 (MATL-CU01 al MATL-CU09)
Perfil                   | PRF      | 3 (PRF-CU01 al PRF-CU03)
Carnets Academicos       | CAR      | 2 (CAR-CU01 al CAR-CU02)
Importacion Masiva Excel | IMP      | 2 (IMP-CU01 al IMP-CU02)
--------------------------|----------|------------------------------------------------------
TOTAL                    |          | 52 CASOS DE USO


### DIAGRAMA GENERAL - TODOS LOS MODULOS

```mermaid
usecaseDiagram
    actor Admin
    actor Matriculador
    actor Estudiante

    package "MATRICULA" {
        usecase "MAT-CU01" as M1
        usecase "MAT-CU02" as M2
        usecase "MAT-CU03" as M3
        usecase "MAT-CU04" as M4
        usecase "MAT-CU05" as M5
        usecase "MAT-CU06" as M6
        usecase "MAT-CU07" as M7
    }

    package "CICLOS" {
        usecase "CIC-CU01" as C1
        usecase "CIC-CU02" as C2
        usecase "CIC-CU03" as C3
    }

    package "PAGOS" {
        usecase "PAG-CU01" as P1
        usecase "PAG-CU02" as P2
        usecase "PAG-CU03" as P3
        usecase "PAG-CU04" as P4
        usecase "PAG-CU05" as P5
    }

    package "USUARIOS" {
        usecase "USR-CU01" as U1
        usecase "USR-CU02" as U2
        usecase "USR-CU03" as U3
    }

    package "ASISTENCIA" {
        usecase "ASIS-CU01" as A1
        usecase "ASIS-CU02" as A2
        usecase "ASIS-CU03" as A3
        usecase "ASIS-CU04" as A4
        usecase "ASIS-CU05" as A5
        usecase "ASIS-CU06" as A6
    }

    package "SIMULACROS" {
        usecase "SIM-CU01" as S1
        usecase "SIM-CU02" as S2
        usecase "SIM-CU03" as S3
        usecase "SIM-CU04" as S4
        usecase "SIM-CU05" as S5
        usecase "SIM-CU06" as S6
        usecase "SIM-CU07" as S7
        usecase "SIM-CU08" as S8
        usecase "SIM-CU09" as S9
    }

    package "MATERIALES" {
        usecase "MATL-CU01" as L1
        usecase "MATL-CU02" as L2
        usecase "MATL-CU03" as L3
        usecase "MATL-CU04" as L4
        usecase "MATL-CU05" as L5
        usecase "MATL-CU06" as L6
        usecase "MATL-CU07" as L7
        usecase "MATL-CU08" as L8
        usecase "MATL-CU09" as L9
    }

    package "ESTUDIANTE" {
        usecase "HPA-CU01" as H1
        usecase "HPA-CU02" as H2
        usecase "RES-CU01" as R1
        usecase "PRF-CU01" as F1
        usecase "PRF-CU02" as F2
        usecase "PRF-CU03" as F3
    }

    package "CARNETS" {
        usecase "CAR-CU01" as K1
        usecase "CAR-CU02" as K2
    }

    package "IMPORTACION" {
        usecase "IMP-CU01" as I1
        usecase "IMP-CU02" as I2
    }

    Admin --> M1
    Admin --> M2
    Admin --> M3
    Admin --> M4
    Admin --> M5
    Admin --> M6
    Admin --> M7
    Admin --> C1
    Admin --> C2
    Admin --> C3
    Admin --> P1
    Admin --> P2
    Admin --> P3
    Admin --> P4
    Admin --> P5
    Admin --> U1
    Admin --> U2
    Admin --> U3
    Admin --> A1
    Admin --> A2
    Admin --> A3
    Admin --> A4
    Admin --> A5
    Admin --> A6
    Admin --> S1
    Admin --> S2
    Admin --> S3
    Admin --> S4
    Admin --> S5
    Admin --> S6
    Admin --> S7
    Admin --> S8
    Admin --> S9
    Admin --> L1
    Admin --> L2
    Admin --> L3
    Admin --> L4
    Admin --> L5
    Admin --> L6
    Admin --> L8
    Admin --> K1
    Admin --> K2
    Admin --> I1
    Admin --> I2

    Matriculador --> M1
    Matriculador --> M2
    Matriculador --> M3
    Matriculador --> M4
    Matriculador --> M5
    Matriculador --> M6
    Matriculador --> M7
    Matriculador --> C1
    Matriculador --> C2
    Matriculador --> C3
    Matriculador --> P1
    Matriculador --> P2
    Matriculador --> P3
    Matriculador --> P4
    Matriculador --> P5
    Matriculador --> U1
    Matriculador --> U2
    Matriculador --> U3
    Matriculador --> A1
    Matriculador --> A2
    Matriculador --> A3
    Matriculador --> A4
    Matriculador --> A5
    Matriculador --> A6
    Matriculador --> S1
    Matriculador --> S2
    Matriculador --> S3
    Matriculador --> S4
    Matriculador --> S5
    Matriculador --> S6
    Matriculador --> S7
    Matriculador --> S9
    Matriculador --> L1
    Matriculador --> L2
    Matriculador --> L3
    Matriculador --> L4
    Matriculador --> L5
    Matriculador --> L6
    Matriculador --> L8
    Matriculador --> K1
    Matriculador --> K2
    Matriculador --> I1
    Matriculador --> I2

    Estudiante --> H1
    Estudiante --> H2
    Estudiante --> R1
    Estudiante --> F1
    Estudiante --> F2
    Estudiante --> F3
    Estudiante --> L7
    Estudiante --> L9
```


====================================================================
FIN DEL DOCUMENTO
====================================================================
