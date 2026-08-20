import firebase_admin
from firebase_admin import credentials, firestore
import os
import json
import base64
from dotenv import load_dotenv

load_dotenv()

if not firebase_admin._apps:
    try:
        encoded_key = os.getenv("FIREBASE_KEY_BASE64")

        if encoded_key:
            # 🔐 Production mode (env variable)
            print("Loading Firebase credentials from environment variable...")
            decoded = base64.b64decode(encoded_key)
            key_dict = json.loads(decoded)
            cred = credentials.Certificate(key_dict)

        elif os.path.exists("serviceAccountKey.json"):
            # 💻 Local development mode
            print("Loading Firebase credentials from local JSON file...")
            cred = credentials.Certificate("serviceAccountKey.json")

        else:
            # ☁️ Cloud fallback
            print("Using default application credentials...")
            cred = credentials.ApplicationDefault()

        firebase_admin.initialize_app(cred, {
            'storageBucket': 'cognexx.appspot.com'
        })

        print("Firebase initialized successfully.")

    except Exception as e:
        print(f"Error initializing Firebase Admin: {e}")

# global db instance
db = firestore.client()
