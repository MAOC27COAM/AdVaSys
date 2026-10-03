# Estructura grafica del sistema — Intranet academica ADUNI Vallejo (AdVaSys)

**Fuente:** codigo del repositorio (React 19, Express 5, Prisma 6, PostgreSQL 18).  
**Actores de tesis:** Administrador, Matriculador, Estudiante. El rol `kami` existe en codigo y no se modela como actor principal.

---

## 1. Contexto (sistema y actores)

```mermaid
flowchart LR
  Admin[Administrador]
  Matr[Matriculador]
  Est[Estudiante]
  Sys[AdVaSys]
  Files[Almacenamiento de archivos]
  DB[(PostgreSQL)]

  Admin --> Sys
  Matr --> Sys
  Est --> Sys
  Sys --> DB
  Sys --> Files
```

---

## 2. Contenedores de despliegue

```mermaid
flowchart TB
  Browser[Navegador]
  Nginx[Nginx :8080]
  FE[Build React SPA]
  API[API Express]
  ORM[Prisma]
  PG[(PostgreSQL 18)]
  Disk[Uploads en disco]

  Browser --> Nginx
  Nginx --> FE
  Nginx -->|"/api y /uploads"| API
  API --> ORM
  ORM --> PG
  API --> Disk
```

Flujo HTTP: el navegador carga la SPA; las llamadas `fetch` van a `/api/*` (JWT en `Authorization`). Nginx proxea hacia el backend. Archivos estaticos de portadas y fotos se sirven bajo `/uploads/...`.

---

## 3. Capas de software

```mermaid
flowchart TB
  subgraph ui [Presentacion]
    Login["/login"]
    Dash["/dashboard/*"]
    Ctx["activeCycleId en memoria"]
  end

  subgraph app [Aplicacion]
    AuthMW[authMiddleware JWT]
    Role[Chequeo de rol]
    Ctrl[Controladores]
  end

  subgraph domain [Dominio persistido]
    Cycle[Cycle]
    Enroll[CycleEnrollment]
    Pay[PaymentAgreement]
    Sim[SimulationEvent]
    Att[AttendanceSession]
    Course[Course y File]
  end

  Login --> Dash
  Dash --> Ctx
  Dash --> AuthMW
  AuthMW --> Role
  Role --> Ctrl
  Ctrl --> Cycle
  Ctrl --> Enroll
  Ctrl --> Pay
  Ctrl --> Sim
  Ctrl --> Att
  Ctrl --> Course
```

---

## 4. Mapa de modulos (UI y API)

```mermaid
flowchart TB
  Auth[Auth JWT]
  CycleSel[Ciclo activo]

  Auth --> CycleSel

  subgraph staffCycle [Staff dependientes del ciclo]
    Matricula[Matricula y carnets]
    Pagos[Pagos]
    Asistencia[Asistencia QR]
    Simulacros[Simulacros]
    Usuarios[Usuarios del ciclo]
  end

  subgraph staffGlobal [Staff sin ciclo obligatorio]
    Materiales[Material de cursos]
    Horarios[Horarios]
    Backup[Backup]
  end

  subgraph studentPortal [Portal estudiante]
    MatConsulta[Material por modalidad]
    MisRes[Mis resultados]
    MisAsis[Mis asistencias]
    Perfil[Perfil y QR]
    MiHorario[Mi horario]
  end

  CycleSel --> Matricula
  CycleSel --> Pagos
  CycleSel --> Asistencia
  CycleSel --> Simulacros
  CycleSel --> Usuarios
  Auth --> Materiales
  Auth --> Horarios
  Auth --> Backup
  Matricula --> Pagos
  Simulacros --> MisRes
  Asistencia --> MisAsis
  Materiales --> MatConsulta
```

| Modulo | Ruta UI | Prefijo API |
|--------|---------|-------------|
| Login | `/login` | `/api/auth` |
| Matricula | `/dashboard/matricula` | `/api/students`, `/api/cycles` |
| Pagos | `/dashboard/pagos` | `/api/payments` |
| Usuarios | `/dashboard/usuarios` | `/api/users` |
| Asistencia | `/dashboard/asistencia` | `/api/attendance` |
| Simulacros | `/dashboard/simulacros` | `/api/simulations` |
| Cursos / material | `/dashboard/cursos` | `/api/courses`, `/api/materials` |
| Horarios | `/dashboard/horarios` | `/api/schedules` |
| Backup | `/dashboard/backup` | `/api/system/backup` |
| Mis resultados | `/dashboard/mis-resultados` | `/api/grades` |
| Mis asistencias | `/dashboard/mis-asistencias` | `/api/attendance/my-history` |
| Perfil | `/dashboard/perfil` | `/api/Perfil` |

---

## 5. Modelo de datos (agrupado)

```mermaid
erDiagram
  Role ||--o{ User : has
  User ||--o| StudentProfile : profile
  User ||--o{ CycleEnrollment : enrolls
  Cycle ||--o{ CycleEnrollment : contains
  CycleEnrollment ||--o| PaymentAgreement : agreement
  PaymentAgreement ||--o{ PaymentInstallment : cuotas
  PaymentAgreement ||--o{ PaymentTransaction : movimientos
  Cycle ||--o{ SimulationEvent : events
  SimulationEvent ||--o{ SimulationInstance : instances
  SimulationInstance ||--o{ SimulationResult : results
  User ||--o{ SimulationResult : student
  Cycle ||--o{ AttendanceSession : sessions
  AttendanceSession ||--o{ AttendanceRecord : records
  User ||--o{ AttendanceRecord : marks
  Course ||--o{ CourseModality : allows
  Course ||--o{ File : materials
  ClassSchedule ||--o{ ClassSession : sessions
  Course ||--o{ ClassSession : taught
```

Nucleo operativo: **Cycle** + **CycleEnrollment**. Pagos cuelgan de la matricula. Simulacros y asistencia se anclan al ciclo. Materiales (`Course`/`File`) son catalogo global filtrado por modalidad.

---

## 6. Acceso por actor

```mermaid
flowchart LR
  subgraph adminActor [Administrador]
    A1[Matricula pagos asistencia]
    A2[Simulacros RAW y PROCESSED]
    A3[Eliminar evento o instancia]
    A4[Crear usuario admin]
    A5[Materiales y backup]
  end

  subgraph matrActor [Matriculador]
    M1[Misma operacion diaria]
    M2[Sin eliminar simulacro en UI]
    M3[Sin crear rol admin]
    M4[Materiales si]
  end

  subgraph estActor [Estudiante]
    E1[Material por modalidad]
    E2[Mis resultados]
    E3[Perfil QR]
    E4[Historial asistencia]
  end
```

---

## 7. Flujo transversal: autenticacion y ciclo

```mermaid
sequenceDiagram
  participant U as Usuario
  participant FE as React
  participant API as Express
  participant DB as PostgreSQL

  U->>FE: POST credenciales /login
  FE->>API: POST /api/auth/login
  API->>DB: Validar User ACTIVE
  API-->>FE: JWT
  FE->>FE: Redirige /dashboard
  FE->>API: GET /api/cycles
  API-->>FE: Lista de ciclos
  FE->>FE: Selecciona ciclo operable startDate-endDate
  Note over FE: activeCycleId habilita matricula, pagos, asistencia, simulacros
```

---

*Elaboracion propia a partir del codigo de AdVaSys, 2026.*
