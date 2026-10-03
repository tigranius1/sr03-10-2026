from rest_framework import serializers
from .models import Task, Category


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name']


class TaskSerializer(serializers.ModelSerializer):
    # Для чтения — отдаём вложенный объект категории
    category_details = CategorySerializer(source='category', read_only=True)

    class Meta:
        model = Task
        fields = ['id', 'title', 'completed', 'category', 'category_details']

    def validate_title(self, value):
        if not value.strip():
            raise serializers.ValidationError('Название не может быть пустым.')
        return value.strip()