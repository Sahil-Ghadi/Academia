from datetime import datetime

def calculate_days_left(exam_date: str) -> int:
    """Calculate days remaining until exam date"""
    try:
        exam = datetime.strptime(exam_date, "%Y-%m-%d")
        today = datetime.today()
        return (exam - today).days
    except ValueError:
        return 0  # Return 0 if date format is invalid
