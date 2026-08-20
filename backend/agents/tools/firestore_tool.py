from db.firebase import db

def get_user_profile(user_id):
    doc = db.collection("academic_profiles").document(user_id).get()
    return doc.to_dict() if doc.exists else {}

def get_user_progress(user_id):
    docs = db.collection("study_progress").where("userId", "==", user_id).stream()
    return [doc.to_dict() for doc in docs]

def save_study_plan(user_id, plan):
    db.collection("study_plans").add({ "userId": user_id, **plan })
