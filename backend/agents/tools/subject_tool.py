SUBJECT_MAP = {
    "BTech": {
        "CSE": {
            "4": ["DBMS", "OS", "CN", "SE"]
        }
    }
}

def get_subjects(degree, branch, semester):
    return SUBJECT_MAP.get(degree, {}).get(branch, {}).get(semester, [])
