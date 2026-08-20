import math
from typing import Tuple

class EloSystem:
    def __init__(self, k_factor: int = 32, initial_rating: float = 1200.0):
        self.k_factor = k_factor
        self.initial_rating = initial_rating

    def expected_score(self, learner_rating: float, question_rating: float) -> float:
        """
        Calculate expected score of the learner against a question.
        """
        return 1 / (1 + math.pow(10, (question_rating - learner_rating) / 400))

    def update_rating(self, learner_rating: float, question_rating: float, actual_score: float) -> Tuple[float, float]:
        """
        Update the rating of both learner and question.
        actual_score: Computed based on accuracy, attempts, hints, and time.
        """
        expected = self.expected_score(learner_rating, question_rating)
        
        # Calculate new ratings
        new_learner_rating = learner_rating + self.k_factor * (actual_score - expected)
        # Question rating moves in the opposite direction
        new_question_rating = question_rating + self.k_factor * (expected - actual_score)
        
        return new_learner_rating, new_question_rating

def calculate_actual_score(is_correct: bool, attempts: int = 1, hints_used: int = 0, time_taken_sec: int = 15, expected_time: int = 30) -> float:
    """
    Calculate an adjusted score (0.0 to 1.0) based on engagement data points.
    """
    if not is_correct:
        return 0.0
    
    score = 1.0
    
    # Penalize for multiple attempts
    if attempts > 1:
        score -= 0.25 * (attempts - 1)
        
    # Penalize for hints
    if hints_used > 0:
        score -= 0.15 * hints_used
        
    # Penalize for taking longer than expected
    if time_taken_sec > expected_time:
        excess = time_taken_sec - expected_time
        # Max penalty of 0.2 for being too slow
        penalty = min(0.2, excess * 0.01) 
        score -= penalty
        
    # Ensure minimum score of 0.1 for actually getting it right eventually
    return max(0.1, score)

