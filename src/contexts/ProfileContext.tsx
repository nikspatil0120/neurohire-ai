import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface Education {
  institutionName: string;
  degree: string;
  startYear: string;
  endYear: string;
  percentage?: string;
  grade?: string;
  cgpa?: string;
  cgpaScale?: string;
}

interface Experience {
  startDate: string;
  endDate?: string;
  currentlyWorking: boolean;
  companyName: string;
  jobRole: string;
  description: string;
}

interface Project {
  projectTitle: string;
  techStack: string[];
  description: string;
}

interface Achievement {
  title: string;
  description: string;
  date?: string;
}

interface AdditionalSection {
  sectionName: string;
  content: any;
}

export interface ProfileData {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  education: Education[];
  experience: Experience[];
  projects: Project[];
  skills: string[];
  achievements: Achievement[];
  additionalSections: AdditionalSection[];
}

interface ProfileContextType {
  profileData: ProfileData;
  profileCompletion: number;
  isLoading: boolean;
  updateProfile: (field: keyof ProfileData, value: string | File | any) => Promise<void>;
  saveProfile: () => Promise<void>;
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
    country: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    education: [],
    experience: [],
    projects: [],
    skills: [],
    achievements: [],
    additionalSections: []
  });

  const [profileCompletion, setProfileCompletion] = useState(0);

  // Load user profile data when user is authenticated
  useEffect(() => {
    const loadProfileData = async () => {
      if (isAuthenticated && user) {
        try {
          const userEmail = user.email || localStorage.getItem('userEmail') || '';
          console.log('[ProfileContext] Loading profile data for:', userEmail);
          const response = await api.getProfileData(userEmail);
          console.log('[ProfileContext] API response:', response);
          
          if (response.success && response.data) {
            console.log('[ProfileContext] Setting profile data from API:', response.data);
            setProfileData({
              fullName: response.data.fullName || '',
              email: response.data.email || '',
              phone: response.data.phone || '',
              country: response.data.country || '',
              dateOfBirth: response.data.dateOfBirth || '',
              gender: response.data.gender || '',
              address: response.data.address || '',
              education: response.data.education || [],
              experience: response.data.experience || [],
              projects: response.data.projects || [],
              skills: response.data.skills || [],
              achievements: response.data.achievements || [],
              additionalSections: response.data.additionalSections || []
            });
          } else {
            console.log('[ProfileContext] No data in response, using fallback');
            // Fall back to user data from auth
            setProfileData({
              fullName: user.name || '',
              email: user.email || '',
              phone: user.profile?.phone || '',
              country: user.profile?.country || '',
              dateOfBirth: user.profile?.dateOfBirth ? new Date(user.profile.dateOfBirth).toISOString().split('T')[0] : '',
              gender: user.profile?.gender || '',
              address: user.profile?.address || '',
              education: user.profile?.education || [],
              experience: user.profile?.experience || [],
              projects: user.profile?.projects || [],
              skills: user.profile?.skills || [],
              achievements: user.profile?.achievements || [],
              additionalSections: user.profile?.additionalSections || []
            });
          }
        } catch (error) {
          console.error('[ProfileContext] Error loading profile data:', error);
          // Fall back to user data from auth
          setProfileData({
            fullName: user.name || '',
            email: user.email || '',
            phone: user.profile?.phone || '',
            country: user.profile?.country || '',
            dateOfBirth: user.profile?.dateOfBirth ? new Date(user.profile.dateOfBirth).toISOString().split('T')[0] : '',
            gender: user.profile?.gender || '',
            address: user.profile?.address || '',
            education: user.profile?.education || [],
            experience: user.profile?.experience || [],
            projects: user.profile?.projects || [],
            skills: user.profile?.skills || [],
            achievements: user.profile?.achievements || [],
            additionalSections: user.profile?.additionalSections || []
          });
        }
      }
    };
    
    loadProfileData();
  }, [user, isAuthenticated]);

  // Calculate profile completion percentage
  useEffect(() => {
    const mandatoryFields = [
      profileData.fullName,
      profileData.email,
      profileData.phone,
      profileData.country,
      profileData.dateOfBirth,
      profileData.gender,
      profileData.address,
    ];
    
    let filledFieldsCount = mandatoryFields.filter(field => {
      if (field === null || field === undefined) return false;
      return field.toString().trim() !== '';
    }).length;
    
    // Add education (at least one required)
    if (profileData.education.length > 0 && profileData.education[0].institutionName) {
      filledFieldsCount += 1;
    }
    
    // Add skills (at least one required)
    if (profileData.skills.length > 0) {
      filledFieldsCount += 1;
    }
    
    const totalFields = mandatoryFields.length + 2; // +1 for education, +1 for skills
    const completion = Math.round((filledFieldsCount / totalFields) * 100);
    
    setProfileCompletion(completion);
  }, [profileData, user]);

  const updateProfile = async (field: keyof ProfileData, value: string | File | any) => {
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
      case 'country':
        profileUpdate.profile.country = value;
        break;
      case 'address':
        profileUpdate.profile.address = value;
        break;
      case 'dateOfBirth':
        profileUpdate.profile.dateOfBirth = value;
        break;
      case 'gender':
        profileUpdate.profile.gender = value;
        break;
      case 'skills':
        // Skills is now an array, handle separately
        break;
      case 'education':
        // Education is now an array, handle separately
        break;
      case 'experience':
        // Experience is now an array, handle separately
        break;
      case 'projects':
        // Projects is now an array, handle separately
        break;
      case 'achievements':
        // Achievements is now an array, handle separately
        break;
      case 'additionalSections':
        // AdditionalSections is now an array, handle separately
        break;
    }

    await api.updateProfile(profileUpdate);
  };

  const saveProfile = async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    try {
      const profileUpdate = {
        fullName: profileData.fullName,
        email: profileData.email,
        phone: profileData.phone,
        country: profileData.country,
        dateOfBirth: profileData.dateOfBirth,
        gender: profileData.gender,
        address: profileData.address,
        education: profileData.education,
        experience: profileData.experience,
        projects: profileData.projects,
        skills: profileData.skills,
        achievements: profileData.achievements,
        additionalSections: profileData.additionalSections
      };

      await api.updateProfile(profileUpdate);
    } catch (error) {
      console.error('Error saving profile:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProfileContext.Provider
      value={{
        profileData,
        profileCompletion,
        isLoading,
        updateProfile,
        saveProfile,
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
