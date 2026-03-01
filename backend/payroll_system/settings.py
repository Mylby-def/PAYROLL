"""
Django settings for payroll_system project.
"""

from pathlib import Path
from decouple import config

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.0/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY', default='django-insecure-change-me-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=True, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=lambda v: [s.strip() for s in v.split(',')])


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'payroll',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'payroll_system.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'payroll_system.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.0/ref/settings/#databases
# Конфиг БД читается из db_config.json (создаётся скриптом run.py при выборе "new")

DB_CONFIG_PATH = BASE_DIR / 'db_config.json'


def _get_databases():
    """Читает настройки БД из db_config.json или возвращает SQLite по умолчанию."""
    import json
    default_sqlite = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
    if not DB_CONFIG_PATH.exists():
        return default_sqlite
    try:
        with open(DB_CONFIG_PATH, 'r', encoding='utf-8') as f:
            cfg = json.load(f)
    except (json.JSONDecodeError, IOError):
        return default_sqlite
    engine = cfg.get('engine', 'sqlite3')
    if engine == 'sqlite3':
        name = cfg.get('name', str(BASE_DIR / 'db.sqlite3'))
        if not Path(name).is_absolute():
            name = str(BASE_DIR / name)
        return {
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': name,
            }
        }
    if engine == 'postgresql':
        return {
            'default': {
                'ENGINE': 'django.db.backends.postgresql',
                'NAME': cfg.get('name', 'payroll'),
                'USER': cfg.get('user', ''),
                'PASSWORD': cfg.get('password', ''),
                'HOST': cfg.get('host', 'localhost'),
                'PORT': cfg.get('port', '5432'),
                'OPTIONS': cfg.get('options', {}),
            }
        }
    if engine == 'mysql':
        return {
            'default': {
                'ENGINE': 'django.db.backends.mysql',
                'NAME': cfg.get('name', 'payroll'),
                'USER': cfg.get('user', ''),
                'PASSWORD': cfg.get('password', ''),
                'HOST': cfg.get('host', 'localhost'),
                'PORT': cfg.get('port', '3306'),
                'OPTIONS': cfg.get('options', {}),
            }
        }
    return default_sqlite


DATABASES = _get_databases()


# Password validation
# https://docs.djangoproject.com/en/5.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.0/ref/settings/#i18n

LANGUAGE_CODE = 'ru-ru'

TIME_ZONE = 'Asia/Vladivostok'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.0/howto/static-files/

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
# https://docs.djangoproject.com/en/5.0/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
}

# CORS
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

CORS_ALLOW_CREDENTIALS = True

# CSRF: разрешаем запросы с фронта (Origin) при session/cookie auth
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]
