"""
Google Gemini API integration client.
Constructs and generates citizen advisories.
"""
import os
import google.generativeai as genai
from typing import Dict, Any

class GeminiAdvisorClient:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "")
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-1.5-flash')
        else:
            self.model = None
        
    def generate_advisory(self, forecast: Dict[str, Any], attribution: Dict[str, Any], language: str = "English", city: str = "Delhi") -> str:
        """
        Queries Gemini to output citizen advisory context.
        Supports "English", "Hindi", and "Kannada".
        """
        aqi = forecast.get('point', 0)
        pred_set = attribution.get('prediction_set', [])
        source = pred_set[0] if pred_set else 'unknown'
        
        if not self.model:
            return f"[Mock Advisory] The AQI in {city} is {aqi:.1f}, primarily due to {source}. Please take precautions. (Set GEMINI_API_KEY for real LLM output in {language})."
            
        prompt = f"""
        You are an expert public health official for {city}.
        Current forecasted AQI: {aqi:.1f}
        Primary pollution source: {source}
        
        Write a short, actionable, and empathetic health advisory (3 sentences max) for the citizens of {city}.
        Translate the advisory into {language}. Return ONLY the translated advisory.
        """
        
        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            return f"Failed to generate advisory: {str(e)}"
