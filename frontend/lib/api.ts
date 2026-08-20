// API Base URL
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Types
export interface StudyPlanRequest {
    user_id: string;
    input_text: string;
}

export interface StudyPlanResponse {
    exam: {
        subject: string;
        exam_date: string;
        topics: string[];
    } | null;
    days_left: number | null;
    urgency: string | null;
    plan: {
        daily_plan: Array<{
            day: number;
            tasks: string[];
        }>;
        total_hours: number;
        priority_topics: string[];
    } | null;
    strategy: string | null;
    message: string;
}

export interface UserProfile {
    uid: string;
    name: string;
    college: string;
    course: string;
    academic_subjects: string[];
    side_hustle_interests: string[];
    onboarded: boolean;
    created_at?: string;
    updated_at?: string;
}

// Study Planner API
export const studyPlannerAPI = {
    async createPlan(request: StudyPlanRequest): Promise<StudyPlanResponse> {
        const response = await fetch(`${API_BASE_URL}/study/create-plan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            throw new Error(`Failed to create study plan: ${response.statusText}`);
        }

        return response.json();
    },

    async healthCheck(): Promise<{ status: string; service: string; agents: string[] }> {
        const response = await fetch(`${API_BASE_URL}/study/health`);

        if (!response.ok) {
            throw new Error(`Health check failed: ${response.statusText}`);
        }

        return response.json();
    },
};

// Profile API
export const profileAPI = {
    async createProfile(profile: Omit<UserProfile, 'created_at' | 'updated_at'>): Promise<UserProfile> {
        const response = await fetch(`${API_BASE_URL}/profile/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(profile),
        });

        if (!response.ok) {
            throw new Error(`Failed to create profile: ${response.statusText}`);
        }

        return response.json();
    },

    async getProfile(uid: string): Promise<UserProfile> {
        const response = await fetch(`${API_BASE_URL}/profile/${uid}`);

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Profile not found');
            }
            throw new Error(`Failed to get profile: ${response.statusText}`);
        }

        return response.json();
    },

    async updateProfile(uid: string, profile: Omit<UserProfile, 'created_at' | 'updated_at'>): Promise<UserProfile> {
        const response = await fetch(`${API_BASE_URL}/profile/${uid}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(profile),
        });

        if (!response.ok) {
            throw new Error(`Failed to update profile: ${response.statusText}`);
        }

        return response.json();
    },

    async deleteProfile(uid: string): Promise<{ message: string }> {
        const response = await fetch(`${API_BASE_URL}/profile/${uid}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error(`Failed to delete profile: ${response.statusText}`);
        }

        return response.json();
    },
};

// Auth API
export const authAPI = {
    async verifyGoogleToken(idToken: string): Promise<{
        uid: string;
        email: string | null;
        display_name: string | null;
        photo_url: string | null;
    }> {
        const response = await fetch(`${API_BASE_URL}/auth/google/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id_token: idToken }),
        });

        if (!response.ok) {
            throw new Error(`Failed to verify token: ${response.statusText}`);
        }

        return response.json();
    },

    async getUser(uid: string) {
        const response = await fetch(`${API_BASE_URL}/auth/user/${uid}`);

        if (!response.ok) {
            throw new Error(`Failed to get user: ${response.statusText}`);
        }

        return response.json();
    },
};
