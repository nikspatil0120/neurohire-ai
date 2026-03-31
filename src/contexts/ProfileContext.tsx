import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  address: string;
  dateOfBirth: string;
  resume: File | null;
  resumeInfo: {
    filename: string;
    originalName: string;
    size: number;
    uploadedAt: string;
  } | null;
  skills: string;
  experience: string;
  education: string;
  bio: string;
}

interface ProfileContextType {
  profileData: ProfileData;
  profileCompletion: number;
  isLoading: boolean;
  updateProfile: (field: keyof ProfileData, value: string | File) => Promise<void>;
  setResume: (file: File | null) => void;
  saveProfile: () => Promise<void>;
  uploadResume: (file: File) => Promise<void>;
  setProfileData: React.Dispatch<React.SetStateAction<ProfileData>>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const [profileData, setProfileData] = useState<ProfileData>({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    address: '',
    dateOfBirth: '',
    resume: null,
    resumeInfo: null,
    skills: '',
    experience: '',
    education: '',
    bio: ''
  });

  const [profileCompletion, setProfileCompletion] = useState(0);

  // Load user profile data when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      setProfileData({
        fullName: user.name || '',
        email: user.email || '',
        phone: user.profile?.phone || '',
        location: '', // Not used in completion calculation
        address: user.profile?.address || '',
        dateOfBirth: user.profile?.dateOfBirth ? new Date(user.profile.dateOfBirth).toISOString().split('T')[0] : '',
        resume: null, // File objects can't be restored from API
        resumeInfo: user.profile?.resume ? {
          filename: user.profile.resume.filename,
          originalName: user.profile.resume.originalName,
          size: user.profile.resume.size,
          uploadedAt: user.profile.resume.uploadedAt
        } : null,
        skills: '', // Not used in completion calculation
        experience: '', // Not used in completion calculation
        education: '', // Not used in completion calculation
        bio: '' // Not used in completion calculation
      });
    }
  }, [user, isAuthenticated]);

  // Calculate profile completion percentage
  useEffect(() => {
    const fields = [
      profileData.fullName,
      profileData.email,
      profileData.phone,
      profileData.address,
      profileData.dateOfBirth
    ];
    
    let filledFieldsCount = fields.filter(field => {
      if (field === null || field === undefined) return false;
      return field.toString().trim() !== '';
    }).length;
    
    // Add resume to completion if it exists
    const resumeExists = profileData.resume || profileData.resumeInfo;
    if (resumeExists) {
      filledFieldsCount += 1;
    }
    
    const totalFields = fields.length + 1; // +1 for resume
    const completion = Math.round((filledFieldsCount / totalFields) * 100);
    
    setProfileCompletion(completion);
  }, [profileData, user]);

  const updateProfile = async (field: keyof ProfileData, value: string | File) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-save for text fields (not for file uploads)
    if (typeof value === 'string' && isAuthenticated) {
      try {
        await saveProfileField(field, value);
      } catch (error) {
        console.error('Error auto-saving profile field:', error);
      }
    }
  };

  const saveProfileField = async (field: keyof ProfileData, value: string) => {
    if (!isAuthenticated) return;

    const profileUpdate: any = {
      profile: {}
    };

    // Map frontend fields to backend fields
    switch (field) {
      case 'fullName':
        profileUpdate.name = value;
        break;
      case 'phone':
        profileUpdate.profile.phone = value;
        break;
      case 'location':
        profileUpdate.profile.location = value;
        break;
      case 'address':
        profileUpdate.profile.address = value;
        break;
      case 'dateOfBirth':
        profileUpdate.profile.dateOfBirth = value;
        break;
      case 'skills':
        profileUpdate.profile.skills = value.split(',').map(s => s.trim()).filter(s => s);
        break;
      case 'experience':
        profileUpdate.profile.experience = value;
        break;
      case 'education':
        profileUpdate.profile.education = value;
        break;
      case 'bio':
        profileUpdate.profile.bio = value;
        break;
    }

    await api.updateProfile(profileUpdate);
  };

  const saveProfile = async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    try {
      const profileUpdate = {
        name: profileData.fullName,
        profile: {
          phone: profileData.phone,
          location: profileData.location,
          address: profileData.address,
          dateOfBirth: profileData.dateOfBirth,
          skills: profileData.skills.split(',').map(s => s.trim()).filter(s => s),
          experience: profileData.experience,
          education: profileData.education,
          bio: profileData.bio
        }
      };

      await api.updateProfile(profileUpdate);
    } catch (error) {
      console.error('Error saving profile:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const uploadResume = async (file: File) => {
    if (!isAuthenticated) {
      throw new Error('You must be logged in to upload a resume');
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('resume', file);

      const response = await api.uploadResume(formData);
      
      if (response.success) {
        // Update local state with both file and resume info
        setProfileData(prev => ({
          ...prev,
          resume: file,
          resumeInfo: {
            filename: response.data.resume.filename,
            originalName: response.data.resume.originalName,
            size: response.data.resume.size,
            uploadedAt: response.data.resume.uploadedAt
          }
        }));
      } else {
        throw new Error(response.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Error uploading resume:', error);
      throw new Error(error.message || 'Failed to upload resume');
    } finally {
      setIsLoading(false);
    }
  };

  const setResume = (file: File | null) => {
    setProfileData(prev => ({
      ...prev,
      resume: file
    }));
  };

  return (
    <ProfileContext.Provider
      value={{
        profileData,
        profileCompletion,
        isLoading,
        updateProfile,
        setResume,
        saveProfile,
        uploadResume,
        setProfileData
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile must be used within ProfileProvider");
  }
  return context;
};
