# Mini-servidor de archivos con microservicios (Node.js)

Práctica de arquitectura de microservicios: cada operación sobre archivos
(subir, descargar, listar, eliminar) es un servicio independiente con su propio
contenedor. Un API Gateway (Nginx) es el punto único de entrada.

## Arquitectura

```
                 ┌──────────────┐
  Cliente ─────▶ │ API Gateway  │  Nginx, puerto 8080
                 └──────┬───────┘
        ┌───────────┬───┴───────┬────────────┐
        ▼           ▼           ▼            ▼
   ┌─────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐
   │ upload  │ │ download │ │  list  │ │  delete  │
   └────┬────┘ └────┬─────┘ └───┬────┘ └────┬─────┘
        │ (rw)      │ (ro)      │           │ (rw)
        ▼           ▼           │           ▼
   ┌───────────────────────┐    │
   │ volumen "files"       │    │
   └───────────────────────┘    │
        todos ──HTTP──▶ ┌──────────────────┐
                        │ metadata-service │──▶ metadata.json (volumen propio)
                        └──────────────────┘
```

| Servicio | Responsabilidad | Ruta pública |
|---|---|---|
| upload-service | Guarda el archivo y registra sus metadatos | `POST /files` (campo `file`) |
| download-service | Devuelve el archivo con su nombre original | `GET /files/{id}` |
| list-service | Lista archivos (filtros `?name=` y `?ext=`) | `GET /files` |
| delete-service | Borra metadato y archivo físico | `DELETE /files/{id}` |
| metadata-service | Único dueño de los metadatos (interno) | — |
| gateway | Enruta por método + ruta | `GET /health` |

Todos los servicios exponen `GET /health` y escuchan en el puerto 5000 dentro de la red de Docker.

## Requisitos

- Docker y Docker Compose

## Ejecución

```bash
docker compose up -d --build
./pruebas.sh                  # pruebas de extremo a extremo
docker compose logs -f        # ver logs de todos los servicios
docker compose down           # detener (agrega -v para borrar los datos)
```

## Uso manual

```bash
curl -F "file=@foto.png" localhost:8080/files       # subir
curl localhost:8080/files                           # listar
curl "localhost:8080/files?ext=png"                 # filtrar
curl -OJ localhost:8080/files/<id>                  # descargar con su nombre
curl -X DELETE localhost:8080/files/<id>            # eliminar
```

## Demostración de aislamiento de fallos

```bash
docker compose stop download
curl localhost:8080/files            # listar sigue funcionando
curl localhost:8080/files/<id>       # 503 {"error":"Servicio no disponible"}
docker compose start download
```

Con `metadata` detenido, upload responde 503 y **borra el archivo recién
recibido** (compensación) para no dejar archivos huérfanos.

## Decisiones de diseño (para el reporte)

- **Datos por servicio:** solo `metadata-service` accede a los metadatos; el resto
  los pide por HTTP. Los bytes van a un volumen compartido como compromiso práctico.
- **Privilegio mínimo:** `download` monta el volumen en solo lectura y `list` no lo monta.
- **Consistencia:** upload compensa si falla el registro; delete borra primero el
  metadato y luego el archivo, para que nunca quede un registro que apunte a nada.
- **Seguridad básica:** los archivos se guardan con un UUID como nombre (sin
  colisiones ni nombres maliciosos), `path.basename` evita path traversal y hay
  límite de tamaño (`MAX_SIZE_MB`).
- **Gateway resiliente:** Nginx usa el DNS de Docker en tiempo de ejecución, así que
  arranca aunque un servicio esté caído y solo esas rutas fallan.

## Extensiones posibles

- auth-service con JWT validado en el gateway
- Eventos con RabbitMQ (`file.deleted` → audit-service)
- `docker compose up -d --scale download=3` para balanceo de carga
- Reemplazar el volumen por MinIO (compatible con S3)
- Frontend HTML que consuma el gateway
