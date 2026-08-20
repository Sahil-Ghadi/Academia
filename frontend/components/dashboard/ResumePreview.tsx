'use client';

import { motion } from 'framer-motion';
import { Mail, Phone, Globe, MapPin } from 'lucide-react';

interface ResumeData {
    personal_info: {
        name: string;
        email: string;
        phone?: string;
        website?: string;
        location?: string;
    };
    summary: string;
    experience: Array<{
        title: string;
        organization: string;
        duration: string;
        description: string;
        achievements: string[];
    }>;
    skills: {
        technical: string[];
        tools: string[];
        soft: string[];
    };
    projects: Array<{
        name: string;
        description: string;
        technologies: string[];
        highlights: string[];
    }>;
    education: Array<{
        degree: string;
        institution: string;
        duration: string;
    }>;
}

interface ResumePreviewProps {
    data: ResumeData;
}

export function ResumePreview({ data }: ResumePreviewProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            id="resume-preview"
            className="bg-white text-black p-12 max-w-4xl mx-auto shadow-2xl"
            style={{ fontFamily: 'Arial, sans-serif' }}
        >
            {/* Header */}
            <div className="border-b-4 border-black pb-6 mb-6">
                <h1 className="text-4xl font-bold mb-2">{data.personal_info.name}</h1>
                <div className="flex flex-wrap gap-4 text-sm text-gray-700">
                    {data.personal_info.email && (
                        <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            <span>{data.personal_info.email}</span>
                        </div>
                    )}
                    {data.personal_info.phone && (
                        <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            <span>{data.personal_info.phone}</span>
                        </div>
                    )}
                    {data.personal_info.website && (
                        <div className="flex items-center gap-1">
                            <Globe className="h-4 w-4" />
                            <span>{data.personal_info.website}</span>
                        </div>
                    )}
                    {data.personal_info.location && (
                        <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{data.personal_info.location}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Professional Summary */}
            {data.summary && (
                <div className="mb-6">
                    <h2 className="text-xl font-bold mb-3 text-black border-b-2 border-gray-300 pb-1">
                        PROFESSIONAL SUMMARY
                    </h2>
                    <p className="text-gray-800 leading-relaxed">{data.summary}</p>
                </div>
            )}

            {/* Experience */}
            {data.experience && data.experience.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-xl font-bold mb-3 text-black border-b-2 border-gray-300 pb-1">
                        EXPERIENCE
                    </h2>
                    {data.experience.map((exp, index) => (
                        <div key={index} className="mb-4">
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="font-bold text-lg">{exp.title}</h3>
                                <span className="text-sm text-gray-600">{exp.duration}</span>
                            </div>
                            <p className="text-gray-700 italic mb-2">{exp.organization}</p>
                            <p className="text-gray-800 mb-2">{exp.description}</p>
                            {exp.achievements && exp.achievements.length > 0 && (
                                <ul className="list-disc list-inside text-gray-800 space-y-1">
                                    {exp.achievements.map((achievement, i) => (
                                        <li key={i}>{achievement}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Projects */}
            {data.projects && data.projects.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-xl font-bold mb-3 text-black border-b-2 border-gray-300 pb-1">
                        PROJECTS
                    </h2>
                    {data.projects.map((project, index) => (
                        <div key={index} className="mb-4">
                            <h3 className="font-bold text-lg mb-1">{project.name}</h3>
                            <p className="text-gray-800 mb-2">{project.description}</p>
                            {project.technologies && project.technologies.length > 0 && (
                                <p className="text-sm text-gray-700 mb-2">
                                    <span className="font-semibold">Technologies:</span>{' '}
                                    {project.technologies.join(', ')}
                                </p>
                            )}
                            {project.highlights && project.highlights.length > 0 && (
                                <ul className="list-disc list-inside text-gray-800 space-y-1">
                                    {project.highlights.map((highlight, i) => (
                                        <li key={i}>{highlight}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Skills */}
            {data.skills && (
                <div className="mb-6">
                    <h2 className="text-xl font-bold mb-3 text-black border-b-2 border-gray-300 pb-1">
                        SKILLS
                    </h2>
                    <div className="space-y-2">
                        {data.skills.technical && data.skills.technical.length > 0 && (
                            <div>
                                <span className="font-semibold">Technical: </span>
                                <span className="text-gray-800">{data.skills.technical.join(', ')}</span>
                            </div>
                        )}
                        {data.skills.tools && data.skills.tools.length > 0 && (
                            <div>
                                <span className="font-semibold">Tools & Frameworks: </span>
                                <span className="text-gray-800">{data.skills.tools.join(', ')}</span>
                            </div>
                        )}
                        {data.skills.soft && data.skills.soft.length > 0 && (
                            <div>
                                <span className="font-semibold">Soft Skills: </span>
                                <span className="text-gray-800">{data.skills.soft.join(', ')}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Education */}
            {data.education && data.education.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-xl font-bold mb-3 text-black border-b-2 border-gray-300 pb-1">
                        EDUCATION
                    </h2>
                    {data.education.map((edu, index) => (
                        <div key={index} className="mb-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-lg">{edu.degree}</h3>
                                    <p className="text-gray-700">{edu.institution}</p>
                                </div>
                                <span className="text-sm text-gray-600">{edu.duration}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </motion.div>
    );
}
