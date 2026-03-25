# PocketBase Collections Setup

Go to http://31.97.128.53:8090/_/ and create the following collections:

## 1. users (extends default auth collection)
Add these fields to the default `users` auth collection:
- name: Text
- plan: Text (default: "free")  
- stripe_customer_id: Text (optional)

## 2. recipes
Fields:
- user: Relation → users (required)
- title: Text (required)
- servings: Number (default: 2)
- ingredients: JSON
- instructions: Text
- image_url: URL
- source_url: URL
- tags: JSON

API Rules:
- List/Search: @request.auth.id != "" && user = @request.auth.id
- View:         @request.auth.id != "" && user = @request.auth.id
- Create:       @request.auth.id != ""
- Update:       @request.auth.id != "" && user = @request.auth.id
- Delete:       @request.auth.id != "" && user = @request.auth.id

## 3. meal_plans
Fields:
- user: Relation → users (required)
- week_start_date: Text (required)

API Rules (same pattern as recipes)

## 4. meal_slots
Fields:
- meal_plan: Relation → meal_plans (required)
- day: Text (required)  — Mon, Tue, Wed, Thu, Fri, Sat, Sun
- slot: Text (required) — Breakfast, Lunch, Dinner, Snacks
- recipe: Relation → recipes (required)
- servings_multiplier: Number (default: 1)

API Rules:
- List/Search: @request.auth.id != "" && meal_plan.user = @request.auth.id
- View:         @request.auth.id != "" && meal_plan.user = @request.auth.id
- Create:       @request.auth.id != ""
- Update:       @request.auth.id != "" && meal_plan.user = @request.auth.id
- Delete:       @request.auth.id != "" && meal_plan.user = @request.auth.id