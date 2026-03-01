#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Скрипт запуска сервера с выбором БД при старте.
- standart (s) — использовать сохранённую конфигурацию БД
- new (n) — ввести данные новой БД и сохранить
"""
import json
import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
DB_CONFIG_PATH = BACKEND_DIR / 'db_config.json'


def load_config():
    """Загружает текущий конфиг БД из файла."""
    if not DB_CONFIG_PATH.exists():
        return None
    try:
        with open(DB_CONFIG_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return None


def save_config(cfg):
    """Сохраняет конфиг БД в файл."""
    with open(DB_CONFIG_PATH, 'w', encoding='utf-8') as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)


def input_default(prompt, default=''):
    """Ввод с подсказкой значения по умолчанию."""
    if default:
        s = input(f'{prompt} [{default}]: ').strip()
        return s if s else default
    return input(f'{prompt}: ').strip()


def ask_database_choice():
    """Спрашивает: standart или new."""
    saved = load_config()
    if saved:
        engine = saved.get('engine', 'sqlite3')
        if engine == 'sqlite3':
            db_info = saved.get('name', 'db.sqlite3')
        else:
            db_info = f"{engine} @ {saved.get('host', '')}/{saved.get('name', '')}"
        print(f'\nСохранённая БД: {db_info}')
    else:
        print('\nСохранённой БД пока нет. Нужно ввести новую (new).')
    print('\n  standart (s) — использовать сохранённую БД')
    print('  new (n)      — ввести данные новой БД и сохранить')
    while True:
        choice = input('\nВыбор [standart/new]: ').strip().lower()
        if choice in ('', 'standart', 's', 'стандарт'):
            return 'standart'
        if choice in ('new', 'n', 'новая'):
            return 'new'
        print('Введите standart (или s) либо new (или n).')


def input_new_database():
    """Запрашивает параметры новой БД и возвращает конфиг."""
    print('\nТип БД: 1 — SQLite, 2 — PostgreSQL, 3 — MySQL')
    t = input('Тип [1]: ').strip() or '1'
    if t == '1':
        name = input_default('Путь к файлу БД (относительно backend или абсолютный)', 'db.sqlite3')
        return {'engine': 'sqlite3', 'name': name}
    if t == '2':
        return {
            'engine': 'postgresql',
            'name': input('Имя базы: ').strip() or 'payroll',
            'user': input('Пользователь: ').strip() or 'postgres',
            'password': input('Пароль: ').strip(),
            'host': input_default('Хост', 'localhost'),
            'port': input_default('Порт', '5432'),
        }
    if t == '3':
        return {
            'engine': 'mysql',
            'name': input('Имя базы: ').strip() or 'payroll',
            'user': input('Пользователь: ').strip() or 'root',
            'password': input('Пароль: ').strip(),
            'host': input_default('Хост', 'localhost'),
            'port': input_default('Порт', '3306'),
        }
    print('Неизвестный тип, используем SQLite.')
    return {'engine': 'sqlite3', 'name': 'db.sqlite3'}


def main():
    os.chdir(BACKEND_DIR)
    choice = ask_database_choice()
    if choice == 'new':
        cfg = input_new_database()
        save_config(cfg)
        print('\nКонфигурация БД сохранена в db_config.json')
    # standart: конфиг уже есть в db_config.json или будет использован default в settings
    print('\nЗапуск сервера...\n')
    sys.path.insert(0, str(BACKEND_DIR))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'payroll_system.settings')
    from django.core.management import execute_from_command_line
    argv = ['manage.py', 'runserver'] + sys.argv[1:]
    execute_from_command_line(argv)


if __name__ == '__main__':
    main()
