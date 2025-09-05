from django.urls import path
from . import views
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import IngredientViewSet, PantryItemViewSet, RecipeViewSet, MealViewSet

router = DefaultRouter()
router.register(r"ingredients", IngredientViewSet)
router.register(r"pantry", PantryItemViewSet)
router.register(r"recipes", RecipeViewSet, basename="recipe")
router.register(r"meals", MealViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path("notes/", views.NoteListCreate.as_view(), name="note-list"),
    path("notes/delete/<int:pk>/", views.NoteDelete.as_view(), name="delete-note"),
]
