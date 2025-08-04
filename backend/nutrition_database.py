import json
import os
from typing import Dict, List, Optional, Tuple


class NutritionDatabase:
    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir
        self.nutrition_data = self._load_json("nutrition_database.json")
        self.density_data = self._load_json("density_database.json")
        self.gi_data = self._load_json("glycemic_index_database.json")
        self.alternatives_data = self._load_json("food_alternatives_database.json")

    def _load_json(self, filename: str) -> Dict:
        """Load JSON data from file"""
        try:
            file_path = os.path.join(self.data_dir, filename)
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"Warning: {filename} not found")
            return {}
        except json.JSONDecodeError as e:
            print(f"Error parsing {filename}: {e}")
            return {}

    def get_nutrition_info(self, food_name: str) -> Optional[Dict]:
        """Get nutrition information for a food item"""
        return self.nutrition_data.get("foods", {}).get(food_name.lower())

    def get_density_info(self, food_name: str) -> Optional[Dict]:
        """Get density and physical properties for weight estimation"""
        return self.density_data.get("density_data", {}).get(food_name.lower())

    def get_gi_info(self, food_name: str) -> Optional[Dict]:
        """Get glycemic index information"""
        return self.gi_data.get("glycemic_index_data", {}).get(food_name.lower())

    def get_alternatives(self, food_name: str) -> Optional[Dict]:
        """Get healthier alternatives for a food item"""
        return self.alternatives_data.get("food_alternatives", {}).get(
            food_name.lower()
        )

    def get_food_pairings(self, food_name: str) -> Optional[Dict]:
        """Get recommended food pairings"""
        return self.alternatives_data.get("smart_food_pairings", {}).get(
            food_name.lower()
        )

    def estimate_weight(
        self, food_name: str, detected_area_cm2: float
    ) -> Tuple[float, Dict]:
        """
        Estimate weight of food item based on detected area and food properties

        Args:
            food_name: Name of the detected food
            detected_area_cm2: Detected area in square centimeters

        Returns:
            Tuple of (estimated_weight_grams, calculation_details)
        """
        density_info = self.get_density_info(food_name)
        if not density_info:
            # Fallback estimation
            return detected_area_cm2 * 0.5, {"method": "fallback", "confidence": "low"}

        density = density_info.get("density_g_per_cm3", 0.7)
        thickness = density_info.get("avg_thickness_cm", 2.0)
        shape_factor = density_info.get("shape_factor", 0.8)

        # Calculate volume and weight
        volume_cm3 = detected_area_cm2 * thickness * shape_factor
        estimated_weight = volume_cm3 * density

        calculation_details = {
            "method": "density_based",
            "confidence": "high",
            "area_cm2": detected_area_cm2,
            "thickness_cm": thickness,
            "density_g_per_cm3": density,
            "shape_factor": shape_factor,
            "volume_cm3": volume_cm3,
        }

        return estimated_weight, calculation_details

    def calculate_meal_risk_score(self, detected_foods: List[Dict]) -> Dict:
        """
        Calculate diabetes risk score for a meal

        Args:
            detected_foods: List of detected foods with weights

        Returns:
            Dictionary with risk score and analysis
        """
        total_gi_load = 0
        total_carbs = 0
        total_fiber = 0
        total_protein = 0
        total_calories = 0

        food_analysis = []

        for food_item in detected_foods:
            food_name = food_item.get("class", "").lower()
            weight_g = food_item.get("weight", 0)

            # Get nutrition and GI data
            nutrition = self.get_nutrition_info(food_name)
            gi_info = self.get_gi_info(food_name)

            if nutrition and gi_info:
                # Calculate nutrition per actual weight
                weight_factor = weight_g / 100  # nutrition data is per 100g

                calories = nutrition["nutrition_per_100g"]["calories"] * weight_factor
                protein = nutrition["nutrition_per_100g"]["protein_g"] * weight_factor
                carbs = nutrition["nutrition_per_100g"]["carbs_g"] * weight_factor
                fiber = (
                    nutrition["nutrition_per_100g"].get("fiber_g", 0) * weight_factor
                    or 0
                )

                # Calculate GI load (GI * carbs / 100)
                gi_load = (gi_info["gi_value"] * carbs) / 100

                total_calories += calories
                total_protein += protein
                total_carbs += carbs
                total_fiber += fiber
                total_gi_load += gi_load

                food_analysis.append(
                    {
                        "food": food_name,
                        "weight_g": weight_g,
                        "gi_value": gi_info["gi_value"],
                        "gi_category": gi_info["gi_category"],
                        "gi_load": gi_load,
                        "calories": calories,
                        "carbs_g": carbs,
                        "fiber_g": fiber,
                        "protein_g": protein,
                    }
                )

        # Calculate risk score using weighted factors
        risk_factors = self.gi_data.get("meal_risk_scoring", {}).get("risk_factors", {})

        gi_load_score = total_gi_load * risk_factors.get("total_gi_load", {}).get(
            "weight", 0.4
        )
        carb_score = (total_carbs / 50) * risk_factors.get("carb_content", {}).get(
            "weight", 0.3
        )
        fiber_score = (total_fiber / 10) * risk_factors.get("fiber_content", {}).get(
            "weight", -0.2
        )
        protein_score = (total_protein / 20) * risk_factors.get(
            "protein_content", {}
        ).get("weight", -0.1)

        risk_score = max(0, gi_load_score + carb_score + fiber_score + protein_score)

        # Determine risk level
        risk_levels = self.gi_data.get("meal_risk_scoring", {}).get("risk_levels", {})
        risk_level = "medium"
        risk_message = "Monitor blood sugar"
        risk_color = "#F59E0B"

        for level, info in risk_levels.items():
            score_range = info.get("score_range", "0-10").split("-")
            min_score = float(score_range[0])
            max_score = float(score_range[1]) if len(score_range) > 1 else 10

            if min_score <= risk_score <= max_score:
                risk_level = level
                risk_message = info.get("message", "Monitor blood sugar")
                risk_color = info.get("color", "#F59E0B")
                break

        return {
            "risk_score": round(risk_score, 2),
            "risk_level": risk_level,
            "risk_message": risk_message,
            "risk_color": risk_color,
            "total_gi_load": round(total_gi_load, 2),
            "total_calories": round(total_calories, 1),
            "total_carbs_g": round(total_carbs, 1),
            "total_fiber_g": round(total_fiber, 1),
            "total_protein_g": round(total_protein, 1),
            "food_analysis": food_analysis,
        }

    def get_diabetes_recommendations(self, detected_foods: List[str]) -> Dict:
        """
        Get diabetes-specific recommendations for detected foods

        Args:
            detected_foods: List of food names

        Returns:
            Dictionary with recommendations and alternatives
        """
        recommendations = {
            "alternatives": {},
            "pairings": {},
            "portion_control": {},
            "timing_advice": {},
        }

        for food_name in detected_foods:
            food_lower = food_name.lower()

            # Get alternatives
            alternatives = self.get_alternatives(food_lower)
            if alternatives:
                recommendations["alternatives"][food_name] = alternatives.get(
                    "healthier_alternatives", []
                )

            # Get pairings
            pairings = self.get_food_pairings(food_lower)
            if pairings:
                recommendations["pairings"][food_name] = pairings.get(
                    "recommended_pairings", []
                )

            # Get GI info for timing and portion advice
            gi_info = self.get_gi_info(food_lower)
            if gi_info:
                recommendations["portion_control"][food_name] = gi_info.get(
                    "portion_recommendation", "Normal portions"
                )
                recommendations["timing_advice"][food_name] = gi_info.get(
                    "timing_advice", "No specific advice"
                )

        return recommendations


# Global instance
nutrition_db = NutritionDatabase()


def get_nutrition_database():
    """Get the global nutrition database instance"""
    return nutrition_db
