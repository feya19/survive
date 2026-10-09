FROM node:22-slim AS assets
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM php:8.3-apache AS php-base
RUN apt-get update \
    && apt-get install -y --no-install-recommends libzip-dev unzip libpq-dev \
    && docker-php-ext-install zip pdo_pgsql \
    && rm -rf /var/lib/apt/lists/*
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer
RUN a2enmod rewrite headers

FROM php-base AS app-build
WORKDIR /var/www/html
COPY . .
RUN composer install --no-dev --no-interaction --prefer-dist --no-progress --no-scripts --optimize-autoloader
COPY --from=assets /build/public/build /var/www/html/public/build

FROM php-base AS test
WORKDIR /var/www/html
COPY . .
RUN cp .env.example .env
RUN composer install --no-interaction --prefer-dist --no-progress --optimize-autoloader
COPY --from=assets /build/public/build /var/www/html/public/build
ENTRYPOINT ["php"]
CMD ["artisan", "test"]

FROM php-base AS runtime
WORKDIR /var/www/html
COPY --from=app-build /var/www/html /var/www/html
COPY docker/apache-vhost.conf /etc/apache2/sites-available/000-default.conf
COPY docker/entrypoint.sh /usr/local/bin/laravel-entrypoint
RUN sed -i 's/\r$//' /usr/local/bin/laravel-entrypoint \
    && chmod +x /usr/local/bin/laravel-entrypoint \
    && mkdir -p storage/app/public storage/framework/cache/data storage/framework/sessions \
       storage/framework/views storage/logs bootstrap/cache /var/lib/laravel \
    && chown -R www-data:www-data storage bootstrap/cache /var/lib/laravel
EXPOSE 80
ENTRYPOINT ["laravel-entrypoint"]
CMD ["apache2-foreground"]
