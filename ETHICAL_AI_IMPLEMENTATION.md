# Ethical AI Implementation

## 🛡️ Consent & Privacy System

```python
# app/services/consent_service.py
from typing import Dict, List
from app.models.user import User
from app.core.database import get_db
import uuid
from datetime import datetime

class ConsentService:
    
    async def create_consent_record(
        self, 
        user_id: str, 
        interview_id: str,
        consent_data: Dict
    ) -> str:
        """Create consent record before interview"""
        
        consent_record = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "interview_id": interview_id,
            "consent_given": consent_data.get("consent_given", False),
            "data_processing_consent": consent_data.get("data_processing", False),
            "recording_consent": consent_data.get("recording", False),
            "ai_analysis_consent": consent_data.get("ai_analysis", False),
            "data_retention_acknowledged": consent_data.get("data_retention", False),
            "timestamp": datetime.utcnow(),
            "ip_address": consent_data.get("ip_address"),
            "user_agent": consent_data.get("user_agent")
        }
        
        # Store in database
        db = get_db()
        await db.consent_records.insert_one(consent_record)
        
        return consent_record["id"]
    
    async def verify_consent(self, interview_id: str) -> bool:
        """Verify all required consents are given"""
        db = get_db()
        
        consent = await db.consent_records.find_one({
            "interview_id": interview_id
        })
        
        if not consent:
            return False
        
        required_consents = [
            "consent_given",
            "data_processing_consent", 
            "recording_consent",
            "ai_analysis_consent"
        ]
        
        return all(consent.get(field, False) for field in required_consents)
    
    async def get_consent_text(self) -> Dict:
        """Get consent form text"""
        return {
            "title": "Interview Consent & Privacy Notice",
            "sections": [
                {
                    "title": "Data Collection",
                    "content": "This interview will record audio and video for evaluation purposes. We will analyze your speech patterns, facial expressions, and responses to assess your suitability for the role."
                },
                {
                    "title": "AI Analysis", 
                    "content": "Our AI system will evaluate your technical knowledge, communication skills, and confidence level. This analysis is used solely for recruitment purposes."
                },
                {
                    "title": "Data Protection",
                    "content": "Your personal data is encrypted and stored securely. We do not use your name, gender, age, or physical appearance in our scoring algorithms."
                },
                {
                    "title": "Data Retention",
                    "content": "Interview recordings are retained for 90 days for quality assurance, then permanently deleted. Anonymized performance data may be retained for system improvement."
                },
                {
                    "title": "Your Rights",
                    "content": "You can request access to your data, request corrections, or withdraw consent at any time by contacting us at privacy@neurohire.ai"
                }
            ],
            "checkboxes": [
                {
                    "id": "data_processing",
                    "text": "I consent to the processing of my personal data for recruitment purposes",
                    "required": True
                },
                {
                    "id": "recording", 
                    "text": "I consent to audio and video recording during the interview",
                    "required": True
                },
                {
                    "id": "ai_analysis",
                    "text": "I consent to AI analysis of my responses and behavior",
                    "required": True
                },
                {
                    "id": "data_retention",
                    "text": "I acknowledge the data retention policy (90 days)",
                    "required": True
                }
            ]
        }
```

## ⚖️ Fair Scoring System

```python
# app/ai/scoring/fair_scorer.py
from typing import Dict, List, Any
import numpy as np
from app.utils.bias_detection import BiasDetector

class FairScoringSystem:
    def __init__(self):
        self.bias_detector = BiasDetector()
        
        # Scoring weights (must sum to 100%)
        self.weights = {
            "technical_knowledge": 0.60,  # 60%
            "communication": 0.25,        # 25% 
            "confidence": 0.15            # 15%
        }
    
    async def calculate_fair_score(
        self, 
        interview_data: Dict,
        candidate_profile: Dict
    ) -> Dict:
        """Calculate fair, unbiased score"""
        
        # Extract only relevant data (no protected attributes)
        scoring_data = self._extract_scoring_features(interview_data)
        
        # Calculate component scores
        technical_score = await self._calculate_technical_score(scoring_data)
        communication_score = await self._calculate_communication_score(scoring_data)
        confidence_score = await self._calculate_confidence_score(scoring_data)
        
        # Weighted final score
        final_score = (
            technical_score * self.weights["technical_knowledge"] +
            communication_score * self.weights["communication"] +
            confidence_score * self.weights["confidence"]
        )
        
        # Bias detection check
        bias_report = await self.bias_detector.check_for_bias(
            scoring_data, 
            final_score,
            candidate_profile
        )
        
        return {
            "final_score": round(final_score, 2),
            "component_scores": {
                "technical": round(technical_score, 2),
                "communication": round(communication_score, 2), 
                "confidence": round(confidence_score, 2)
            },
            "scoring_explanation": self._generate_explanation(
                technical_score, communication_score, confidence_score
            ),
            "bias_check": bias_report,
            "scoring_weights": self.weights
        }
    
    def _extract_scoring_features(self, interview_data: Dict) -> Dict:
        """Extract only job-relevant features for scoring"""
        
        # EXPLICITLY EXCLUDE protected attributes
        excluded_fields = [
            "name", "gender", "age", "race", "ethnicity", 
            "photo", "appearance", "accent", "native_language"
        ]
        
        return {
            "answers": interview_data.get("answers", []),
            "technical_responses": interview_data.get("technical_responses", []),
            "speech_clarity": interview_data.get("speech_metrics", {}).get("clarity", 0),
            "response_coherence": interview_data.get("coherence_scores", []),
            "voice_confidence": interview_data.get("voice_analysis", {}).get("confidence", 0),
            "engagement_level": interview_data.get("engagement_metrics", 0),
            "question_difficulty_handled": interview_data.get("difficulty_progression", [])
        }
    
    async def _calculate_technical_score(self, data: Dict) -> float:
        """Calculate technical knowledge score"""
        
        technical_responses = data.get("technical_responses", [])
        if not technical_responses:
            return 0.0
        
        # Average of technical question scores
        scores = [response.get("score", 0) for response in technical_responses]
        
        # Weight by question difficulty
        weighted_scores = []
        for response in technical_responses:
            score = response.get("score", 0)
            difficulty = response.get("difficulty", 1)
            weighted_score = score * (difficulty / 3.0)  # Normalize difficulty
            weighted_scores.append(weighted_score)
        
        return np.mean(weighted_scores) if weighted_scores else 0.0
    
    async def _calculate_communication_score(self, data: Dict) -> float:
        """Calculate communication skills score"""
        
        # Speech clarity (0-100)
        clarity = data.get("speech_clarity", 0)
        
        # Response coherence (average of all responses)
        coherence_scores = data.get("response_coherence", [])
        avg_coherence = np.mean(coherence_scores) if coherence_scores else 0
        
        # Engagement level
        engagement = data.get("engagement_level", 0)
        
        # Weighted combination
        communication_score = (
            0.4 * clarity +
            0.4 * avg_coherence + 
            0.2 * engagement
        )
        
        return min(100, max(0, communication_score))
    
    async def _calculate_confidence_score(self, data: Dict) -> float:
        """Calculate confidence score from voice analysis only"""
        
        # Use only voice-based confidence metrics
        voice_confidence = data.get("voice_confidence", 0)
        
        # Avoid using visual cues that might introduce bias
        return voice_confidence
    
    def _generate_explanation(
        self, 
        technical: float, 
        communication: float, 
        confidence: float
    ) -> Dict:
        """Generate explainable scoring breakdown"""
        
        explanations = {
            "technical": self._explain_technical_score(technical),
            "communication": self._explain_communication_score(communication),
            "confidence": self._explain_confidence_score(confidence),
            "overall": self._explain_overall_score(technical, communication, confidence)
        }
        
        return explanations
    
    def _explain_technical_score(self, score: float) -> str:
        """Explain technical score"""
        if score >= 80:
            return "Excellent technical knowledge demonstrated across multiple areas"
        elif score >= 60:
            return "Good technical understanding with room for improvement in some areas"
        elif score >= 40:
            return "Basic technical knowledge, needs development in key areas"
        else:
            return "Limited technical knowledge demonstrated"
    
    def _explain_communication_score(self, score: float) -> str:
        """Explain communication score"""
        if score >= 80:
            return "Clear, articulate communication with good structure"
        elif score >= 60:
            return "Generally clear communication with minor areas for improvement"
        elif score >= 40:
            return "Communication is understandable but could be more structured"
        else:
            return "Communication needs significant improvement for clarity"
    
    def _explain_confidence_score(self, score: float) -> str:
        """Explain confidence score"""
        if score >= 80:
            return "Spoke with confidence and conviction throughout"
        elif score >= 60:
            return "Generally confident with some hesitation on complex topics"
        elif score >= 40:
            return "Moderate confidence level, some uncertainty evident"
        else:
            return "Low confidence level, significant hesitation observed"
    
    def _explain_overall_score(
        self, 
        technical: float, 
        communication: float, 
        confidence: float
    ) -> str:
        """Explain overall score"""
        
        final = (
            technical * 0.60 + 
            communication * 0.25 + 
            confidence * 0.15
        )
        
        if final >= 80:
            return "Strong candidate with excellent technical skills and communication"
        elif final >= 60:
            return "Good candidate with solid technical foundation"
        elif final >= 40:
            return "Candidate shows potential but needs development in key areas"
        else:
            return "Candidate requires significant development before being job-ready"
```

## 🔍 Bias Detection System

```python
# app/utils/bias_detection.py
import numpy as np
from typing import Dict, List, Any
import logging

class BiasDetector:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Define protected attributes that should NOT influence scoring
        self.protected_attributes = [
            "gender", "age", "race", "ethnicity", "nationality",
            "accent", "appearance", "name", "photo_features"
        ]
    
    async def check_for_bias(
        self, 
        scoring_data: Dict,
        final_score: float,
        candidate_profile: Dict
    ) -> Dict:
        """Check for potential bias in scoring"""
        
        bias_report = {
            "bias_detected": False,
            "warnings": [],
            "recommendations": [],
            "fairness_score": 100
        }
        
        # Check 1: Ensure no protected attributes in scoring data
        protected_found = self._check_protected_attributes(scoring_data)
        if protected_found:
            bias_report["bias_detected"] = True
            bias_report["warnings"].append(
                f"Protected attributes found in scoring: {protected_found}"
            )
            bias_report["fairness_score"] -= 30
        
        # Check 2: Score distribution analysis
        score_analysis = await self._analyze_score_distribution(final_score)
        if score_analysis["outlier"]:
            bias_report["warnings"].append(
                "Score appears to be an outlier - review recommended"
            )
            bias_report["fairness_score"] -= 10
        
        # Check 3: Component score balance
        balance_check = self._check_score_balance(scoring_data)
        if not balance_check["balanced"]:
            bias_report["warnings"].append(
                f"Unbalanced scoring detected: {balance_check['issue']}"
            )
            bias_report["fairness_score"] -= 15
        
        # Generate recommendations
        if bias_report["warnings"]:
            bias_report["recommendations"] = self._generate_bias_recommendations(
                bias_report["warnings"]
            )
        
        # Log bias detection results
        if bias_report["bias_detected"]:
            self.logger.warning(f"Bias detected in scoring: {bias_report}")
        
        return bias_report
    
    def _check_protected_attributes(self, scoring_data: Dict) -> List[str]:
        """Check if protected attributes are present in scoring data"""
        found_attributes = []
        
        def check_nested_dict(data, path=""):
            if isinstance(data, dict):
                for key, value in data.items():
                    current_path = f"{path}.{key}" if path else key
                    if key.lower() in [attr.lower() for attr in self.protected_attributes]:
                        found_attributes.append(current_path)
                    if isinstance(value, (dict, list)):
                        check_nested_dict(value, current_path)
            elif isinstance(data, list):
                for i, item in enumerate(data):
                    check_nested_dict(item, f"{path}[{i}]")
        
        check_nested_dict(scoring_data)
        return found_attributes
    
    async def _analyze_score_distribution(self, score: float) -> Dict:
        """Analyze if score is within normal distribution"""
        
        # In production, this would compare against historical data
        # For now, use statistical thresholds
        
        normal_range = (20, 95)  # Expected score range
        
        is_outlier = score < normal_range[0] or score > normal_range[1]
        
        return {
            "outlier": is_outlier,
            "score": score,
            "expected_range": normal_range,
            "percentile": min(99, max(1, score))  # Rough percentile
        }
    
    def _check_score_balance(self, scoring_data: Dict) -> Dict:
        """Check if component scores are reasonably balanced"""
        
        # Extract component scores if available
        technical_responses = scoring_data.get("technical_responses", [])
        if not technical_responses:
            return {"balanced": True}
        
        scores = [resp.get("score", 0) for resp in technical_responses]
        
        if not scores:
            return {"balanced": True}
        
        # Check for extreme variance
        score_std = np.std(scores)
        score_mean = np.mean(scores)
        
        # High variance might indicate inconsistent evaluation
        coefficient_of_variation = score_std / score_mean if score_mean > 0 else 0
        
        if coefficient_of_variation > 0.5:  # 50% CV threshold
            return {
                "balanced": False,
                "issue": f"High score variance (CV: {coefficient_of_variation:.2f})",
                "scores": scores
            }
        
        return {"balanced": True}
    
    def _generate_bias_recommendations(self, warnings: List[str]) -> List[str]:
        """Generate recommendations to address bias"""
        
        recommendations = []
        
        for warning in warnings:
            if "protected attributes" in warning.lower():
                recommendations.append(
                    "Remove protected attributes from scoring algorithm"
                )
            elif "outlier" in warning.lower():
                recommendations.append(
                    "Manual review recommended for outlier score"
                )
            elif "unbalanced" in warning.lower():
                recommendations.append(
                    "Review scoring consistency across questions"
                )
        
        # General recommendations
        recommendations.extend([
            "Ensure scoring focuses only on job-relevant skills",
            "Consider multiple evaluation rounds for consistency",
            "Document scoring rationale for transparency"
        ])
        
        return recommendations
```

## 📊 Explainable AI Reports

```python
# app/ai/scoring/report_generator.py
from typing import Dict, List
import matplotlib.pyplot as plt
import seaborn as sns
from io import BytesIO
import base64

class ExplainableReportGenerator:
    
    async def generate_detailed_report(
        self, 
        interview_data: Dict,
        scoring_results: Dict,
        candidate_info: Dict
    ) -> Dict:
        """Generate comprehensive, explainable report"""
        
        report = {
            "candidate_id": candidate_info.get("id"),
            "interview_date": interview_data.get("date"),
            "job_title": interview_data.get("job", {}).get("title"),
            
            "executive_summary": self._generate_executive_summary(scoring_results),
            
            "detailed_scores": {
                "final_score": scoring_results["final_score"],
                "components": scoring_results["component_scores"],
                "weights_used": scoring_results["scoring_weights"]
            },
            
            "question_by_question": await self._analyze_question_performance(
                interview_data.get("questions", [])
            ),
            
            "strengths": self._identify_strengths(scoring_results, interview_data),
            "areas_for_improvement": self._identify_improvements(scoring_results, interview_data),
            
            "behavioral_analysis": self._analyze_behavior(interview_data),
            
            "recommendations": {
                "hiring_recommendation": self._get_hiring_recommendation(scoring_results["final_score"]),
                "development_areas": self._suggest_development_areas(scoring_results),
                "next_steps": self._suggest_next_steps(scoring_results["final_score"])
            },
            
            "fairness_report": scoring_results.get("bias_check", {}),
            
            "visualizations": await self._generate_visualizations(scoring_results, interview_data)
        }
        
        return report
    
    def _generate_executive_summary(self, scoring_results: Dict) -> str:
        """Generate executive summary"""
        
        final_score = scoring_results["final_score"]
        components = scoring_results["component_scores"]
        
        if final_score >= 80:
            recommendation = "Strong Hire"
            summary_start = "Excellent candidate with strong performance across all areas."
        elif final_score >= 60:
            recommendation = "Hire"
            summary_start = "Good candidate with solid technical foundation."
        elif final_score >= 40:
            recommendation = "Consider"
            summary_start = "Candidate shows potential but needs development."
        else:
            recommendation = "No Hire"
            summary_start = "Candidate requires significant development."
        
        # Highlight strongest area
        strongest_area = max(components.items(), key=lambda x: x[1])
        weakest_area = min(components.items(), key=lambda x: x[1])
        
        summary = f"{summary_start} "
        summary += f"Strongest in {strongest_area[0]} ({strongest_area[1]:.1f}%), "
        summary += f"needs improvement in {weakest_area[0]} ({weakest_area[1]:.1f}%). "
        summary += f"Overall recommendation: {recommendation}."
        
        return summary
    
    async def _analyze_question_performance(self, questions: List[Dict]) -> List[Dict]:
        """Analyze performance on each question"""
        
        analysis = []
        
        for i, question in enumerate(questions):
            q_analysis = {
                "question_number": i + 1,
                "question_text": question.get("text", ""),
                "difficulty": question.get("difficulty", 1),
                "category": question.get("category", ""),
                "candidate_score": question.get("score", 0),
                "time_taken": question.get("time_taken", 0),
                "key_points_covered": question.get("keywords_found", []),
                "missed_concepts": question.get("missed_keywords", []),
                "feedback": question.get("feedback", "")
            }
            
            analysis.append(q_analysis)
        
        return analysis
    
    def _identify_strengths(self, scoring_results: Dict, interview_data: Dict) -> List[str]:
        """Identify candidate strengths"""
        
        strengths = []
        components = scoring_results["component_scores"]
        
        # Score-based strengths
        if components["technical"] >= 80:
            strengths.append("Excellent technical knowledge and problem-solving skills")
        elif components["technical"] >= 60:
            strengths.append("Good technical foundation")
        
        if components["communication"] >= 80:
            strengths.append("Clear and articulate communication")
        elif components["communication"] >= 60:
            strengths.append("Good communication skills")
        
        if components["confidence"] >= 80:
            strengths.append("High confidence and self-assurance")
        elif components["confidence"] >= 60:
            strengths.append("Good confidence level")
        
        # Behavioral strengths
        behavioral_data = interview_data.get("behavioral_metrics", {})
        if behavioral_data.get("engagement_level", 0) >= 80:
            strengths.append("High engagement and enthusiasm")
        
        if behavioral_data.get("eye_contact_percentage", 0) >= 70:
            strengths.append("Good eye contact and presence")
        
        return strengths
    
    def _identify_improvements(self, scoring_results: Dict, interview_data: Dict) -> List[str]:
        """Identify areas for improvement"""
        
        improvements = []
        components = scoring_results["component_scores"]
        
        if components["technical"] < 60:
            improvements.append("Technical knowledge needs strengthening")
        
        if components["communication"] < 60:
            improvements.append("Communication clarity could be improved")
        
        if components["confidence"] < 60:
            improvements.append("Building confidence in responses")
        
        # Specific technical areas
        questions = interview_data.get("questions", [])
        weak_categories = {}
        
        for question in questions:
            category = question.get("category", "general")
            score = question.get("score", 0)
            
            if category not in weak_categories:
                weak_categories[category] = []
            weak_categories[category].append(score)
        
        for category, scores in weak_categories.items():
            avg_score = sum(scores) / len(scores)
            if avg_score < 60:
                improvements.append(f"Strengthen knowledge in {category}")
        
        return improvements
    
    def _analyze_behavior(self, interview_data: Dict) -> Dict:
        """Analyze behavioral patterns"""
        
        behavioral_metrics = interview_data.get("behavioral_metrics", {})
        
        return {
            "engagement_level": behavioral_metrics.get("engagement_level", 0),
            "eye_contact_percentage": behavioral_metrics.get("eye_contact_percentage", 0),
            "speech_pace": behavioral_metrics.get("speech_pace", "normal"),
            "pause_patterns": behavioral_metrics.get("pause_patterns", "appropriate"),
            "overall_demeanor": self._assess_demeanor(behavioral_metrics)
        }
    
    def _assess_demeanor(self, metrics: Dict) -> str:
        """Assess overall demeanor"""
        
        engagement = metrics.get("engagement_level", 0)
        confidence = metrics.get("confidence_level", 0)
        
        if engagement >= 80 and confidence >= 80:
            return "Confident and engaged"
        elif engagement >= 60 and confidence >= 60:
            return "Professional and composed"
        elif engagement < 40 or confidence < 40:
            return "Reserved or nervous"
        else:
            return "Moderate engagement"
    
    def _get_hiring_recommendation(self, final_score: float) -> str:
        """Get hiring recommendation"""
        
        if final_score >= 80:
            return "Strong Hire - Excellent candidate, recommend immediate offer"
        elif final_score >= 70:
            return "Hire - Good candidate, recommend offer"
        elif final_score >= 60:
            return "Hire - Solid candidate with minor development needs"
        elif final_score >= 40:
            return "Consider - Potential candidate, may need additional interviews"
        else:
            return "No Hire - Candidate needs significant development"
    
    async def _generate_visualizations(self, scoring_results: Dict, interview_data: Dict) -> Dict:
        """Generate visualization charts"""
        
        visualizations = {}
        
        # Score breakdown chart
        components = scoring_results["component_scores"]
        
        plt.figure(figsize=(10, 6))
        categories = list(components.keys())
        scores = list(components.values())
        
        bars = plt.bar(categories, scores, color=['#00d9ff', '#9333ea', '#10b981'])
        plt.title('Score Breakdown by Category')
        plt.ylabel('Score (%)')
        plt.ylim(0, 100)
        
        # Add value labels on bars
        for bar, score in zip(bars, scores):
            plt.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 1,
                    f'{score:.1f}%', ha='center', va='bottom')
        
        # Save to base64
        buffer = BytesIO()
        plt.savefig(buffer, format='png', bbox_inches='tight', dpi=150)
        buffer.seek(0)
        score_chart = base64.b64encode(buffer.getvalue()).decode()
        plt.close()
        
        visualizations["score_breakdown"] = score_chart
        
        return visualizations
```