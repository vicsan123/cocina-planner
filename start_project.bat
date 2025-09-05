@echo off
REM Abrir backend en una terminal
start cmd /k "cd backend && python manage.py runserver 0.0.0.0:8000"

REM Abrir frontend en otra terminal
start cmd /k "cd frontend && npm run dev"

exit
