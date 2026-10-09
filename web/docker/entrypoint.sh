#!/bin/sh
set -eu

if [ -z "${APP_KEY:-}" ]; then
    echo "APP_KEY is required. Generate one with: docker compose run --rm --no-deps --entrypoint php web artisan key:generate --show" >&2
    exit 1
fi

database_path="${DB_DATABASE:-/var/www/html/database/database.sqlite}"
upload_limit="${ML_API_MAX_UPLOAD_MB:-200}"
case "$upload_limit" in
    ''|*[!0-9]*)
        echo "ML_API_MAX_UPLOAD_MB must be a positive integer." >&2
        exit 1
        ;;
esac
upload_limit="$(printf '%s' "$upload_limit" | sed 's/^0*//')"
[ -n "$upload_limit" ] || upload_limit=0
post_limit=$((upload_limit + 2))
printf 'upload_max_filesize=%sM\npost_max_size=%sM\n' "$upload_limit" "$post_limit" \
    > /usr/local/etc/php/conf.d/zz-upload-limits.ini

mkdir -p "$(dirname "$database_path")" \
    /var/www/html/storage/app/public \
    /var/www/html/storage/framework/cache/data \
    /var/www/html/storage/framework/sessions \
    /var/www/html/storage/framework/views \
    /var/www/html/storage/logs \
    /var/www/html/bootstrap/cache
if [ "${DB_CONNECTION:-sqlite}" = "sqlite" ] && [ "$database_path" != ":memory:" ]; then
    touch "$database_path"
fi
chown -R www-data:www-data /var/lib/laravel /var/www/html/storage /var/www/html/bootstrap/cache

php artisan package:discover --ansi >/dev/null
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    php artisan migrate --force --no-interaction
fi
php artisan storage:link --force >/dev/null 2>&1 || true

exec "$@"
