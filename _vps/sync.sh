#!/usr/bin/env bash
# Publica cada carpeta del repo "sitios" como <carpeta>.somfylabs.cloud.
# Lo ejecuta un timer de systemd cada minuto, como root.
#
# Reglas de seguridad:
# - Solo gestiona carpetas con nombre en minúsculas, dígitos y guiones (las que empiezan por _ o . se ignoran).
# - Nunca toca un sitio de nginx que ya exista sin la marca "# gestionado por sitios".
# - Borrar una carpeta del repo no borra nada en el servidor.
# - En el VPS se ejecuta la copia instalada en /usr/local/sbin/sitios-sync, no la del repo:
#   un push no cambia lo que se ejecuta como root (reinstalar a mano tras revisar).
set -euo pipefail

BASE_DOMAIN=somfylabs.cloud
REPO=https://github.com/albert-crypto-sy/sitios.git
SRC=/opt/sitios
MARK="# gestionado por sitios"
EMAIL=admin@somfylabs.cloud
STATE=/var/lib/sitios
mkdir -p "$STATE"

exec 9>/run/sitios-sync.lock
flock -n 9 || exit 0

log() { echo "sitios: $*"; }

if [ -d "$SRC/.git" ]; then
  git -C "$SRC" fetch -q origin main
  git -C "$SRC" reset -q --hard origin/main
else
  git clone -q "$REPO" "$SRC"
fi

MY_IPS=" $(hostname -I) "
reload=0

for dir in "$SRC"/*/; do
  name=$(basename "$dir")
  [[ "$name" =~ ^[a-z0-9][a-z0-9-]*$ ]] || continue
  [ -f "$dir/index.html" ] || { log "$name sin index.html, lo salto"; continue; }

  domain="$name.$BASE_DOMAIN"
  web="/var/www/$domain"
  conf="/etc/nginx/sites-available/$domain"

  if [ -f "$conf" ] && ! grep -qF "$MARK" "$conf"; then
    log "$domain ya existe y no está gestionado por sitios, no lo toco"
    continue
  fi

  if [ ! -f "$conf" ]; then
    # otro sitio de nginx (p. ej. lms-somfy) ya sirve este dominio: no crear un duplicado
    # (certbot podría acabar editando el sitio ajeno)
    if grep -RlsE "server_name[^;]*[[:space:]]$domain([[:space:];]|\$)" /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ >/dev/null; then
      log "$domain ya lo sirve otro sitio de nginx, no lo toco"
      continue
    fi
    if [ -e "$web" ]; then
      log "$web ya existe sin sitio gestionado, no lo toco"
      continue
    fi
  fi

  mkdir -p "$web"
  # --no-links: no publicar enlaces simbólicos (podrían apuntar fuera de la web)
  rsync -a --delete --no-links --exclude '.*' "$dir" "$web/"

  if [ ! -f "$conf" ]; then
    cat > "$conf" <<EOF
$MARK
server {
    listen 80;
    listen [::]:80;
    server_name $domain;

    root $web;
    index index.html;

    location / {
        try_files \$uri \$uri/ =404;
    }

    location ~* \.(css|js|svg|png|jpg|webp|woff2?)\$ {
        expires 1h;
        add_header Cache-Control "public";
    }

    gzip on;
    gzip_types text/css application/javascript image/svg+xml;
}
EOF
    ln -sf "$conf" "/etc/nginx/sites-enabled/$domain"
    if ! nginx -t -q 2>/dev/null; then
      # no dejar nginx con una configuración rota que bloquee las recargas del resto de sitios
      rm -f "/etc/nginx/sites-enabled/$domain" "$conf"
      log "la configuración de $domain no pasa nginx -t, la retiro"
      continue
    fi
    log "creado el sitio $domain"
    reload=1
  fi

  # HTTPS: en cuanto el DNS apunte a este servidor
  if ! grep -q "ssl_certificate" "$conf"; then
    resolved=$(getent ahostsv4 "$domain" | awk 'NR==1{print $1}' || true)
    if [ -n "$resolved" ] && [[ "$MY_IPS" == *" $resolved "* ]]; then
      fail="$STATE/$domain.certfail"
      # tras un fallo, espera 30 min para no chocar con los límites de Let's Encrypt
      if [ -f "$fail" ] && [ $(( $(date +%s) - $(stat -c %Y "$fail") )) -lt 1800 ]; then
        continue
      fi
      if nginx -t -q && systemctl reload nginx; then
        reload=0
        if certbot --nginx -d "$domain" --non-interactive --agree-tos --redirect -m "$EMAIL" -q; then
          rm -f "$fail"; log "certificado emitido para $domain"
        else
          touch "$fail"; log "certbot falló para $domain, se reintenta en 30 minutos"
        fi
      fi
    else
      log "$domain todavía no apunta a este servidor (resuelve a '${resolved:-nada}')"
    fi
  fi
done

if [ "$reload" = 1 ]; then
  nginx -t -q && systemctl reload nginx
fi
