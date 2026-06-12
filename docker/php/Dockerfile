FROM php:8.3-fpm

WORKDIR /var/www

RUN apt-get update && apt-get install -y \
    libpq-dev \
    zip \
    unzip \
    git \
    && rm -rf /var/lib/apt/lists/*

RUN docker-php-ext-install pdo pdo_pgsql

RUN docker-php-ext-enable opcache

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

CMD ["php-fpm"]
