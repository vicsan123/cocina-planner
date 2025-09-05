from django.db import models
from django.contrib.auth.models import User


class Note(models.Model):
    title = models.CharField(max_length=100)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notes")

    def __str__(self):
        return self.title
    
# core/models.py
from django.db import models

class Unit(models.TextChoices):
    G = "g", "g"
    KG = "kg", "kg"
    ML = "ml", "ml"
    L = "l", "l"
    PCS = "pcs", "pcs"
    TBSP = "tbsp", "tbsp"
    TSP = "tsp", "tsp"
    U = "u", "u"

class Ingredient(models.Model):
    name = models.CharField(max_length=120, unique=True)
    default_unit = models.CharField(max_length=10, choices=Unit.choices, default=Unit.G)

    def __str__(self): return self.name

class PantryItem(models.Model):
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE, related_name="pantry_items")
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    unit = models.CharField(max_length=10, choices=Unit.choices)

    class Meta:
        unique_together = ("ingredient", "unit")

    def __str__(self): return f"{self.ingredient.name}: {self.quantity}{self.unit}"

# core/models.py
class Recipe(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    servings = models.PositiveIntegerField(default=1)
    image = models.ImageField(upload_to="recipes/", blank=True, null=True)  # 👈 NUEVO

    def __str__(self): 
        return self.title


class RecipeIngredient(models.Model):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name="ingredients")
    ingredient = models.ForeignKey(Ingredient, on_delete=models.PROTECT)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=10, choices=Unit.choices)

    class Meta:
        unique_together = ("recipe", "ingredient", "unit")

class Meal(models.Model):
    """Un 'meal' por día (puedes duplicar por comidas si añades un campo 'slot')."""
    date = models.DateField(db_index=True)
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE)
    # opcional: slot = models.CharField(max_length=20, choices=(...), default="dinner")

    class Meta:
        unique_together = ("date", "recipe")
        ordering = ["date"]
