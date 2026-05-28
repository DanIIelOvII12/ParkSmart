# ParkSmart - Sistema Inteligente de Gestión de Parqueaderos

Proyecto académico desarrollado para la asignatura de Ingeniería de Software - UNIMINUTO 2026.

## Estructura del proyecto

```
parqueaderos-app/
├── index.html        # Punto de entrada del SPA
├── css/
│   └── styles.css    # Todos los estilos (variables, componentes, responsive)
├── js/
│   └── app.js        # Lógica completa de la aplicación
└── README.md
```

## Despliegue en GitHub Pages

1. Crea un repositorio en GitHub (puede ser público o privado con plan Pro).
2. Sube todos los archivos manteniendo la estructura de carpetas.
3. Ve a **Settings → Pages**.
4. En **Source**, selecciona la rama `main` y la carpeta `/ (root)`.
5. Haz clic en **Save**. GitHub Pages publicará el sitio en:
   `https://<tu-usuario>.github.io/<nombre-del-repositorio>/`

> No se requiere ningún servidor ni configuración adicional.
> La aplicación funciona completamente en el navegador (sin backend).

## Credenciales de demo

| Rol           | Correo            | Contraseña |
|---------------|-------------------|------------|
| Administrador | admin@park.co     | admin123   |
| Usuario       | user@park.co      | user123    |

## Funcionalidades implementadas

- Vista de disponibilidad en tiempo real con mapa interactivo
- Filtro de espacios por zona (A, B, C)
- Reserva de espacios con validación de placa y duración
- Cancelación de reservas con regla de 15 minutos de anticipación
- Historial de accesos con búsqueda
- Panel de administración con KPIs, gestión de espacios y usuarios
- Gráfica de ocupación por hora (Canvas 2D, sin librerías externas)
- Exportación de reportes a CSV
- Notificaciones toast
- Diseño responsive para móvil y escritorio
- Accesibilidad básica (roles ARIA, navegación por teclado)
