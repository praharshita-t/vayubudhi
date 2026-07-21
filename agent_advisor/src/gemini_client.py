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
        
    def generate_advisory(self, forecast: Dict[str, Any], attribution: Dict[str, Any], language: str = "English", city: str = "Delhi", reading: Dict[str, Any] = None) -> str:
        """
        Queries Gemini to output citizen advisory context.
        Supports "English", "Hindi", and "Kannada".
        """
        reading = reading or {}
        points = forecast.get('points', [0])
        forecast_aqi = points[0] if points else 0
        live_pm25 = reading.get('pm25', 0)
        live_pm10 = reading.get('pm10', 0)
        live_temp = reading.get('temp', 0)
        
        pred_set = attribution.get('prediction_set', [])
        source = pred_set[0] if pred_set else 'unknown'
        
        if not self.model:
            return f"[Mock Advisory] The AQI forecast in {city} is {forecast_aqi:.1f}, primarily due to {source}. Please take precautions. (Set GEMINI_API_KEY for real LLM output in {language})."
            
        prompt = f"""
        You are an expert public health official for {city}.
        Current LIVE conditions:
        - PM2.5: {live_pm25:.1f}
        - PM10: {live_pm10:.1f}
        - Temp: {live_temp:.1f} C
        
        Forecasted AQI for tomorrow: {forecast_aqi:.1f}
        Primary predicted pollution source: {source}
        
        Write a short, actionable, and empathetic health advisory (3 sentences max) for the citizens of {city}.
        Make sure to reference the CURRENT live conditions (e.g. PM2.5 of {live_pm25:.1f}) and the FORECAST for tomorrow. Do not invent an AQI value for today.
        Translate the advisory into {language}. Return ONLY the translated advisory.
        """
        
        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            return f"Failed to generate advisory: {str(e)}"
