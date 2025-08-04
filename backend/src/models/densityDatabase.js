// Density database for food items - same as frontend
const FOOD_DENSITY_DATABASE = {
  apple: { density: 0.85, name: "Apple", category: "fruit" },
  banana: { density: 0.94, name: "Banana", category: "fruit" },
  orange: { density: 0.87, name: "Orange", category: "fruit" },
  bread: { density: 0.28, name: "Bread", category: "grain" },
  rice: { density: 1.45, name: "Cooked Rice", category: "grain" },
  chicken: { density: 1.05, name: "Chicken Breast", category: "protein" },
  beef: { density: 1.04, name: "Beef", category: "protein" },
  potato: { density: 1.08, name: "Potato", category: "vegetable" },
  carrot: { density: 1.03, name: "Carrot", category: "vegetable" },
  broccoli: { density: 0.92, name: "Broccoli", category: "vegetable" },
  pasta: { density: 1.1, name: "Cooked Pasta", category: "grain" },
  cheese: { density: 1.15, name: "Cheese", category: "dairy" },
  egg: { density: 1.03, name: "Egg", category: "protein" },
  fish: { density: 1.04, name: "Fish", category: "protein" },
  tomato: { density: 0.95, name: "Tomato", category: "vegetable" },
  // Generic fallback densities
  fruit: { density: 0.9, name: "Generic Fruit", category: "fruit" },
  vegetable: { density: 1.0, name: "Generic Vegetable", category: "vegetable" },
  protein: { density: 1.05, name: "Generic Protein", category: "protein" },
  grain: { density: 0.8, name: "Generic Grain", category: "grain" },
  dairy: { density: 1.1, name: "Generic Dairy", category: "dairy" },
};

function getFoodDensity(foodClass) {
  const normalizedClass = foodClass.toLowerCase();

  // Try exact match first
  if (FOOD_DENSITY_DATABASE[normalizedClass]) {
    return FOOD_DENSITY_DATABASE[normalizedClass].density;
  }

  // Try to match category or partial name
  for (const [key, data] of Object.entries(FOOD_DENSITY_DATABASE)) {
    if (normalizedClass.includes(key) || key.includes(normalizedClass)) {
      return data.density;
    }
  }

  // Default density for unknown foods
  return 1.0;
}

function getFoodInfo(foodClass) {
  const normalizedClass = foodClass.toLowerCase();
  return (
    FOOD_DENSITY_DATABASE[normalizedClass] || {
      density: 1.0,
      name: foodClass,
      category: "unknown",
    }
  );
}

function getAllFoodTypes() {
  return Object.keys(FOOD_DENSITY_DATABASE);
}

module.exports = {
  FOOD_DENSITY_DATABASE,
  getFoodDensity,
  getFoodInfo,
  getAllFoodTypes,
};
