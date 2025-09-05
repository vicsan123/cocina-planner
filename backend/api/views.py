# Create your views here.
from django.shortcuts import render
from django.contrib.auth.models import User
from rest_framework import generics
from .serializers import UserSerializer, NoteSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Note, Unit
from datetime import date, timedelta
from collections import defaultdict
from decimal import Decimal
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from decimal import Decimal
from django.db import transaction

from .models import Ingredient, PantryItem, Recipe, Meal, RecipeIngredient
from .serializers import (
    IngredientSerializer, PantryItemSerializer, RecipeSerializer, MealSerializer
)
import json
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
class NoteListCreate(generics.ListCreateAPIView):
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Note.objects.filter(author=user)

    def perform_create(self, serializer):
        if serializer.is_valid():
            serializer.save(author=self.request.user)
        else:
            print(serializer.errors)


class NoteDelete(generics.DestroyAPIView):
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Note.objects.filter(author=user)


class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

# core/views.py (continuación corregida)
class IngredientViewSet(viewsets.ModelViewSet):
    queryset = Ingredient.objects.all()
    serializer_class = IngredientSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=["post"], url_path="add")
    def add(self, request):
        """
        POST /api/ingredients/add/
        Crea el ingrediente si no existe (por nombre) o devuelve el existente.
        """
        name = (request.data.get("name") or "").strip()
        default_unit = request.data.get("default_unit") or Unit.G

        if not name:
            return Response({"detail": "name es obligatorio"}, status=status.HTTP_400_BAD_REQUEST)
        if default_unit not in dict(Unit.choices):
            return Response({"detail": "default_unit inválido"}, status=status.HTTP_400_BAD_REQUEST)

        obj, created = Ingredient.objects.get_or_create(
            name=name,
            defaults={"default_unit": default_unit},
        )
        # opcional: actualizar unidad si ya existía
        if not created and obj.default_unit != default_unit:
            obj.default_unit = default_unit
            obj.save(update_fields=["default_unit"])

        data = self.get_serializer(obj).data
        return Response(data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class PantryItemViewSet(viewsets.ModelViewSet):
    queryset = PantryItem.objects.select_related("ingredient").all()
    serializer_class = PantryItemSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=["post"], url_path="upsert")
    @transaction.atomic
    def upsert(self, request):
        """
        Crea o actualiza un item de despensa por (ingredient, unit).
        Body: { "ingredient": id, "quantity": number, "unit": "g|kg|ml|l|pcs|tbsp|tsp", "mode": "add|set" }
        - mode=add (por defecto): suma a lo existente
        - mode=set: reemplaza la cantidad
        """
        try:
            ingredient_id = int(request.data.get("ingredient"))
        except (TypeError, ValueError):
            return Response({"detail": "ingredient inválido"}, status=400)

        try:
            quantity = Decimal(str(request.data.get("quantity")))
        except Exception:
            return Response({"detail": "quantity inválido"}, status=400)

        unit = request.data.get("unit")
        if unit not in dict(Unit.choices):
            return Response({"detail": "unit inválido"}, status=400)

        mode = (request.data.get("mode") or "add").lower()
        if mode not in {"add", "set"}:
            return Response({"detail": "mode debe ser 'add' o 'set'"}, status=400)

        # verifica ingrediente
        try:
            Ingredient.objects.get(id=ingredient_id)
        except Ingredient.DoesNotExist:
            return Response({"detail": "ingredient no existe"}, status=404)

        item, created = PantryItem.objects.get_or_create(
            ingredient_id=ingredient_id,
            unit=unit,
            defaults={"quantity": quantity},
        )

        if not created:
            if mode == "add":
                item.quantity = (item.quantity or Decimal("0")) + quantity
            else:  # mode == "set"
                item.quantity = quantity
            item.save(update_fields=["quantity"])

        data = self.get_serializer(item).data
        return Response(data, status=201 if created else 200)


class RecipeViewSet(viewsets.ModelViewSet):
    queryset = Recipe.objects.all().prefetch_related("ingredients")
    serializer_class = RecipeSerializer
    parser_classes = (JSONParser, FormParser, MultiPartParser)  # 👈 importante
    permission_classes = [AllowAny]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def _coerce_ingredients(self, data):
        mutable = data.copy()
        payload = dict(mutable) 
        for k, v in list(payload.items()):
            if isinstance(v, list) and len(v) == 1:
                payload[k] = v[0]

        ings = payload.get("ingredients", None)
        if isinstance(ings, str):
            import json
            payload["ingredients"] = json.loads(ings or "[]")
        return payload

    def create(self, request, *args, **kwargs):
        try:
            data = self._coerce_ingredients(request.data)
        except ValueError as e:
            return Response({"detail": str(e)}, status=400)
        ser = self.get_serializer(data=data)
        ser.is_valid(raise_exception=True)
        self.perform_create(ser)
        return Response(ser.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        try:
            data = self._coerce_ingredients(request.data)
        except ValueError as e:
            return Response({"detail": str(e)}, status=400)
        ser = self.get_serializer(instance, data=data, partial=partial)
        ser.is_valid(raise_exception=True)
        self.perform_update(ser)
        return Response(ser.data)
    
class MealViewSet(viewsets.ModelViewSet):
    queryset = Meal.objects.select_related("recipe").all()
    serializer_class = MealSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        start = self.request.query_params.get("start")
        end = self.request.query_params.get("end")
        if start and end:
            return qs.filter(date__gte=start, date__lte=end)
        return qs

    @action(detail=False, methods=["get"])
    def shopping_list(self, request):
        """
        GET /api/meals/shopping_list?start=YYYY-MM-DD&end=YYYY-MM-DD&servings=1
        Suma ingredientes de recetas planificadas, resta lo disponible en despensa,
        y devuelve lo que falta (>0).
        """
        start = request.query_params.get("start")
        end = request.query_params.get("end")
        scale_servings = Decimal(request.query_params.get("servings", "1"))

        if not start or not end:
            return Response({"detail": "start y end son obligatorios"}, status=400)

        meals = Meal.objects.filter(date__gte=start, date__lte=end).select_related("recipe")
        need = defaultdict(lambda: defaultdict(Decimal))  # [ingredient_id][unit] = qty

        for m in meals:
            ris = RecipeIngredient.objects.filter(recipe=m.recipe).select_related("ingredient")
            for ri in ris:
                qty = Decimal(ri.quantity) * scale_servings
                need[ri.ingredient_id][ri.unit] += qty

        pantry = PantryItem.objects.all()
        for p in pantry:
            if p.ingredient_id in need and p.unit in need[p.ingredient_id]:
                need[p.ingredient_id][p.unit] -= Decimal(p.quantity)

        items = []
        ingredients_map = {i.id: i for i in Ingredient.objects.all()}
        for ing_id, units in need.items():
            for unit, qty in units.items():
                if qty > 0:
                    items.append({
                        "ingredient_id": ing_id,
                        "ingredient_name": ingredients_map[ing_id].name,
                        "quantity_needed": round(qty, 2),
                        "unit": unit,
                    })

        return Response({"missing": items})


class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

