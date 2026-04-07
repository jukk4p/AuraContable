# Principios de Diseño de la API (Server Actions)

Para asegurar una comunicación robusta entre el frontend y el backend en AuraContable, seguiremos estos principios en todas las Server Actions:

## 1. Tipado Estricto de Resultados
Todas las acciones deben retornar un objeto con una estructura predecible:

```typescript
type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string; code?: string };
```

## 2. Validación con Zod
Nunca procesar datos de entrada (`formData` o `json`) sin antes validarlos con un esquema de Zod. Esto previene errores de tipo en tiempo de ejecución y ataques de inyección.

## 3. Seguridad y Sesión
Cada acción protegida debe verificar la identidad del usuario:
- Usar `getServerSession()` o `auth()` al inicio de la acción.
- Comparar el `userId` de la solicitud con el del objeto a manipular.

## 4. Manejo de Errores Centralizado
Usar bloques `try-catch` para capturar errores de base de datos o lógica y mapearlos a mensajes legibles para el usuario, evitando filtrar información técnica sensible.

## 5. Revalidación de Caché
Es obligatorio llamar a `revalidatePath()` o `revalidateTag()` después de cualquier mutación exitosa para asegurar que el Next.js Data Cache se actualice y el usuario vea los cambios inmediatamente.
