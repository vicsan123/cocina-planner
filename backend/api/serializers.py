from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Note, Unit
from decimal import Decimal


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "password"]
        extra_kwargs = {"password": {"write_only": True}}

    def create(self, validated_data):
        print(validated_data)
        user = User.objects.create_user(**validated_data)
        return user


class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = ["id", "title", "content", "created_at", "author"]
        extra_kwargs = {"author": {"read_only": True}}

from .models import Ingredient, PantryItem, Recipe, RecipeIngredient, Meal

class IngredientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ingredient
        fields = ["id", "name", "default_unit"]

class PantryItemSerializer(serializers.ModelSerializer):
    ingredient_detail = IngredientSerializer(source="ingredient", read_only=True)
    class Meta:
        model = PantryItem
        fields = ["id", "ingredient", "ingredient_detail", "quantity", "unit"]

class RecipeIngredientSerializer(serializers.ModelSerializer):
    ingredient_detail = IngredientSerializer(source="ingredient", read_only=True)
    class Meta:
        model = RecipeIngredient
        fields = ["id", "ingredient", "ingredient_detail", "quantity", "unit"]

class RecipeIngredientWriteSerializer(serializers.Serializer):
    ingredient = serializers.PrimaryKeyRelatedField(queryset=Ingredient.objects.all())
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2)
    unit = serializers.ChoiceField(choices=Unit.choices)

class RecipeSerializer(serializers.ModelSerializer):
    ingredients = RecipeIngredientWriteSerializer(many=True, required=False)
    image = serializers.ImageField(required=False, allow_null=True, write_only=True)
    image_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Recipe
        fields = ("id", "title", "description", "servings", "ingredients", "image", "image_url")

    def get_image_url(self, obj):
        request = self.context.get("request")
        img = getattr(obj, "image", None)
        if img and hasattr(img, "url"):
            return request.build_absolute_uri(img.url) if request else img.url
        return None

    def validate(self, attrs):
        # obliga a tener al menos un ingrediente en CREATE
        if self.instance is None and not attrs.get("ingredients"):
            raise serializers.ValidationError({"ingredients": "Debes añadir al menos un ingrediente."})
        return attrs

    def create(self, validated_data):
        ings = validated_data.pop("ingredients", [])
        image = validated_data.pop("image", None)
        recipe = Recipe.objects.create(**validated_data)
        if image is not None and hasattr(recipe, "image"):
            recipe.image = image
            recipe.save(update_fields=["image"])
        if ings:
            RecipeIngredient.objects.bulk_create([
                RecipeIngredient(
                    recipe=recipe,
                    ingredient=ing["ingredient"],
                    quantity=Decimal(ing["quantity"]),
                    unit=ing["unit"],
                ) for ing in ings
            ])
        return recipe

    def update(self, instance, validated_data):
        ings = validated_data.pop("ingredients", None)  # solo si viene, se reemplaza
        image = validated_data.pop("image", None)

        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()

        if image is not None and hasattr(instance, "image"):
            instance.image = image or None
            instance.save(update_fields=["image"])

        if ings is not None:
            instance.ingredients.all().delete()
            if ings:
                RecipeIngredient.objects.bulk_create([
                    RecipeIngredient(
                        recipe=instance,
                        ingredient=ing["ingredient"],
                        quantity=Decimal(ing["quantity"]),
                        unit=ing["unit"],
                    ) for ing in ings
                ])
        return instance

    # respuesta con ingredient_detail
    def to_representation(self, instance):
        base = super().to_representation(instance)
        items = []
        for ri in instance.ingredients.select_related("ingredient").all():
            items.append({
                "ingredient": ri.ingredient_id,
                "quantity": str(ri.quantity),
                "unit": ri.unit,
                "ingredient_detail": IngredientSerializer(ri.ingredient).data,
            })
        base["ingredients"] = items
        return base

class MealSerializer(serializers.ModelSerializer):
    recipe_detail = RecipeSerializer(source="recipe", read_only=True)
    class Meta:
        model = Meal
        fields = ["id", "date", "recipe", "recipe_detail"]
