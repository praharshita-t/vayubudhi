"""
LangGraph coordinator orchestrating inputs from ML forecasting, classification,
and routing results to invoke multilingual advisory reports.
"""
from typing import Dict, Any
import os
import sys

# Add the parent directory of agent_advisor to the path to import Gemini client
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from gemini_client import GeminiAdvisorClient

class AgentCoordinator:
    def __init__(self):
        self.gemini_client = GeminiAdvisorClient()
        
    def execute(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Runs the compiled workflow graph.
        State expects:
        - forecast: dict
        - attribution: dict
        - language: str
        - city: str
        """
        forecast = state.get("forecast", {})
        attribution = state.get("attribution", {})
        language = state.get("language", "English")
        city = state.get("city", "Delhi")
        reading = state.get("reading", {})
        
        advisory_result = self.gemini_client.generate_advisory(
            forecast=forecast, 
            attribution=attribution, 
            language=language,
            city=city,
            reading=reading,
            mode=state.get("mode", "district_live"),
            district_name=state.get("district_name"),
            district_aqi=state.get("district_aqi"),
            best_districts=state.get("best_districts"),
            worst_districts=state.get("worst_districts")
        )
        
        return advisory_result
