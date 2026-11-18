#!/usr/bin/env bash
# Pruebas de extremo a extremo contra el API Gateway.
# Uso: ./pruebas.sh
set -e
GW=${GW:-http://localhost:8080}

echo "== 1. Salud del gateway";  curl -s $GW/health; echo
echo "Hola desde el microservicio" > prueba.txt

echo "== 2. Subir archivo"
RESP=$(curl -s -F "file=@prueba.txt" $GW/files); echo "$RESP"
ID=$(echo "$RESP" | sed -E 's/.*"id":"([^"]+)".*/\1/')

echo "== 3. Listar archivos";             curl -s $GW/files; echo
echo "== 4. Filtrar por extensión txt";   curl -s "$GW/files?ext=txt"; echo
echo "== 5. Descargar ($ID)";             curl -s $GW/files/$ID; echo
echo "== 6. Eliminar";                    curl -s -X DELETE $GW/files/$ID; echo
echo "== 7. Descargar de nuevo (404)";    curl -s -w " [HTTP %{http_code}]" $GW/files/$ID; echo

rm -f prueba.txt
echo
echo "Prueba de aislamiento de fallos (manual):"
echo "  docker compose stop download"
echo "  curl $GW/files          -> sigue funcionando"
echo "  curl $GW/files/<id>     -> 503 solo para descargas"
echo "  docker compose start download"
