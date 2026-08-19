# Guía del Sistema de Diseño - Intranet Vallejo

Este documento sirve como referencia principal para la reconstrucción de los estilos de los componentes. El objetivo es mantener una apariencia visual consistente en toda la aplicación.

---

## 1. Paleta de Colores

Utilice estas variables CSS para todos los colores. No utilice valores hexadecimales directamente en los componentes.

### Colores Principales
- `var(--color-primary)`: `#7c3aed` (Púrpura principal para botones, enlaces y elementos activos)
- `var(--color-accent)`: `#f97316` (Naranja para acentos, notificaciones o llamadas a la acción)

### Fondos
- `var(--color-background-dark)`: `#0f172a` (Fondo principal de la aplicación, azul noche)
- `var(--color-background-light)`: `#1e293b` (Fondo para elementos elevados como tarjetas y modales)

### Texto
- `var(--color-text-primary)`: `#e2e8f0` (Texto principal, gris muy claro)
- `var(--color-text-secondary)`: `#94a3b8` (Texto secundario, para subtítulos o información menos importante)

### Bordes y Divisiones
- `var(--color-border)`: `#334155` (Bordes para inputs, tarjetas, etc.)

### Colores de Estado
- `var(--color-success)`: `#22c55e` (Para mensajes de éxito)
- `var(--color-warning)`: `#f59e0b` (Para advertencias)
- `var(--color-error)`: `#ef4444` (Para mensajes de error)

---

## 2. Tipografía

### Familias de Fuente
- `var(--font-sans)`: Fuente principal de la interfaz (Segoe UI, Roboto, etc.)
- `var(--font-serif)`: `Georgia, serif` (Usar solo si se requiere un estilo serif específico)

### Estilos Base
- **Párrafos (`p`):** Color `var(--color-text-primary)`.
- **Encabezados (`h1`, `h2`, etc.):** Color `var(--color-text-primary)`, `font-family: var(--font-sans)`.

---

## 3. Espaciado y Tamaños

Utilice estas variables para todos los `margin`, `padding` y `gap` para mantener un ritmo vertical y horizontal consistente.

- `var(--spacing-xs)`: `4px`
- `var(--spacing-sm)`: `8px`
- `var(--spacing-md)`: `16px`
- `var(--spacing-lg)`: `24px`
- `var(--spacing-xl)`: `32px`

### Layout
- **Altura del Header:** `var(--header-height)`: `70px`
- **Ancho del Sidebar:** `var(--sidebar-width)`: `250px`

---

## 4. Bordes y Sombras

- **Radio de Borde:** `var(--border-radius)`: `8px` (Aplicar a tarjetas, botones, inputs, etc.)
- **Bordes:** `1px solid var(--color-border)`

---

## Ejemplo de Uso en un Componente (`.module.css`)

```css
.card {
  background-color: var(--color-background-light);
  padding: var(--spacing-lg);
  border-radius: var(--border-radius);
  border: 1px solid var(--color-border);
}

.title {
  color: var(--color-text-primary);
  font-size: 1.5rem; /* El tamaño puede ser específico del componente */
  margin-bottom: var(--spacing-md);
}

.button {
  background-color: var(--color-primary);
  color: var(--color-text-primary);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius);
  border: none;
  cursor: pointer;
}
```
