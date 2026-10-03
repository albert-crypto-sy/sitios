# sitios

Las webs estáticas de somfylabs.cloud. **Cada carpeta es un subdominio**:
`pruebas/` se publica en https://pruebas.somfylabs.cloud.

## Cómo publicar una web

1. Crea una carpeta con el nombre del subdominio (minúsculas, dígitos y guiones) y un `index.html` dentro.
2. Haz que el DNS del subdominio apunte al VPS (registro A a `191.215.40.138`).
3. Sube a `main`.

En menos de un minuto el VPS descarga el repo, copia la carpeta a `/var/www/<subdominio>.somfylabs.cloud`,
crea su sitio de nginx si es nuevo y, en cuanto el DNS resuelve, pide el certificado HTTPS.

## Cómo funciona en el VPS

- `_vps/sync.sh` corre cada minuto mediante `sitios-sync.timer` (systemd), como root. Se ejecuta la copia instalada en
  `/usr/local/sbin/sitios-sync`, no la del repo: cambiar el script en el repo no cambia lo que corre en el VPS hasta reinstalarlo a mano.
- No crea un sitio si otro sitio de nginx ya sirve ese dominio (p. ej. `lms`, `rma`, `www`).
- Solo toca sitios de nginx creados por él (llevan la marca `# gestionado por sitios`). Los demás sitios del servidor no se tocan nunca.
- Borrar una carpeta del repo no borra nada del servidor.
- Logs: `journalctl -u sitios-sync -n 50`.

### Instalación (una sola vez, como root)

```sh
git clone https://github.com/albert-crypto-sy/sitios.git /opt/sitios
install -m 755 /opt/sitios/_vps/sync.sh /usr/local/sbin/sitios-sync
cp /opt/sitios/_vps/sitios-sync.service /opt/sitios/_vps/sitios-sync.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now sitios-sync.timer
```
