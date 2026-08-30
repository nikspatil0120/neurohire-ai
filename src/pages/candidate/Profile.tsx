import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import ProfilePhotoCapture from "@/components/ProfilePhotoCapture";
import { LayoutDashboard, Target, Building2, FileText, User, LogOut, Save, Eye, X, Plus, Camera, CheckCircle, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { useProfile } from "@/contexts/ProfileContext";

const navItems = [
  { label: "Dashboard", href: "/candidate/dashboard", icon: LayoutDashboard },
  { label: "Practice", href: "/candidate/practice", icon: Target },
  { label: "Company Interviews", href: "/candidate/interviews", icon: Building2 },
  { label: "Incoming Opportunities", href: "/candidate/incoming-opportunities", icon: Briefcase },
  { label: "Reports", href: "/candidate/reports", icon: FileText },
  { label: "Profile", href: "/candidate/profile", icon: User },
  { label: "Logout", href: "/login", icon: LogOut },
];

const CandidateProfile = () => {
  const { profileData, profileCompletion, updateProfile, setProfileData } = useProfile();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Profile photo states
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [faceRegistered, setFaceRegistered] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [showAdditionalSectionModal, setShowAdditionalSectionModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionContent, setNewSectionContent] = useState('');

  const handleInputChange = (field: keyof typeof profileData, value: string | string[]) => {
    updateProfile(field, value as any);
  };

  const validateForm = () => {
    const errors = [];
    
    if (!profileData.fullName.trim()) {
      errors.push('Full Name is required');
    }
    
    if (!profileData.email.trim()) {
      errors.push('Email is required');
    } else if (!/\S+@\S+\.\S+/.test(profileData.email)) {
      errors.push('Please enter a valid email address');
    }
    
    if (!profileData.phone.trim()) {
      errors.push('Mobile Number is required');
    } else if (!/^\+?[\d\s\-()]+$/.test(profileData.phone)) {
      errors.push('Please enter a valid mobile number');
    }
    
    if (!profileData.country.trim()) {
      errors.push('Country is required');
    }
    
    if (!profileData.dateOfBirth) {
      errors.push('Date of Birth is required');
    }
    
    if (!profileData.gender) {
      errors.push('Gender is required');
    }
    
    if (!profileData.address.trim()) {
      errors.push('Address is required');
    }
    
    if (profileData.education.length === 0 || !profileData.education[0].institutionName) {
      errors.push('Please add at least one education record');
    }
    
    if (profileData.skills.length === 0) {
      errors.push('Please add at least one skill');
    }
    
    return errors;
  };

  const handleSave = async () => {
    // Clear previous errors
    setFormErrors([]);
    
    // Validate form
    const errors = validateForm();
    if (errors.length > 0) {
      setFormErrors(errors);
      errors.forEach(error => toast.error(error));
      return;
    }

    // Start submission
    setIsSubmitting(true);
    
    try {
      toast.loading('Saving profile...', { id: 'save-profile' });
      
      // Get user email
      const userEmail = localStorage.getItem('userEmail') || profileData.email;
      
      const saveData = {
        fullName: profileData.fullName,
        email: profileData.email,
        phone: profileData.phone,
        country: profileData.country,
        dateOfBirth: profileData.dateOfBirth,
        gender: profileData.gender,
        address: profileData.address,
        education: profileData.education,
        skills: profileData.skills,
        experience: profileData.experience,
        projects: profileData.projects,
        achievements: profileData.achievements,
        additionalSections: profileData.additionalSections
      };
      
      console.log('[Profile] Saving profile data:', saveData);
      console.log('[Profile] Projects with techStack:', saveData.projects);
      
      // Save all profile data to backend API in one call
      const { api } = await import('@/lib/api');
      const response = await api.updateProfile(saveData);
      console.log('[Profile] Save response:', response);
      
      toast.success('Profile saved successfully!', { id: 'save-profile' });
      setShowSuccessModal(true);
      setFormErrors([]);
      
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile. Please try again.', { id: 'save-profile' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-save additional section when created
  const handleAddAdditionalSection = async () => {
    if (newSectionName.trim() && newSectionContent.trim()) {
      const newSection = { sectionName: newSectionName, content: newSectionContent };
      updateProfile('additionalSections', [...profileData.additionalSections, newSection] as any);
      
      // Auto-save to backend
      try {
        const { api } = await import('@/lib/api');
        const userEmail = localStorage.getItem('userEmail') || profileData.email;
        await api.updateProfile({
          fullName: profileData.fullName,
          email: profileData.email,
          phone: profileData.phone,
          country: profileData.country,
          dateOfBirth: profileData.dateOfBirth,
          gender: profileData.gender,
          address: profileData.address,
          education: profileData.education,
          skills: profileData.skills,
          experience: profileData.experience,
          projects: profileData.projects,
          achievements: profileData.achievements,
          additionalSections: [...profileData.additionalSections, newSection]
        });
        toast.success('Section added and saved');
      } catch (error) {
        console.error('Error auto-saving section:', error);
      }
      
      setNewSectionName('');
      setNewSectionContent('');
      setShowAdditionalSectionModal(false);
    }
  };

  const getFieldError = (fieldName: string) => {
    return formErrors.find(error => error.toLowerCase().includes(fieldName.toLowerCase()));
  };

  const isFieldInvalid = (fieldName: string) => {
    return formErrors.some(error => error.toLowerCase().includes(fieldName.toLowerCase()));
  };

  // Load saved profile on component mount
  useEffect(() => {
    // Profile data is loaded from ProfileContext via useProfile hook
    // which fetches from backend when user is authenticated
    
    // Load profile photo
    loadProfilePhoto();
  }, []);

  const loadProfilePhoto = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const userEmail = localStorage.getItem('userEmail') || profileData.email || 'sahilghogaressg06@gmail.com';
      
      if (!token) {
        console.log('No auth token found - user not logged in');
        // If no token, camera will show by default
        return;
      }
      
      const response = await fetch(`http://localhost:8000/api/v1/users/profile/photo?email=${encodeURIComponent(userEmail)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.status === 401) {
        console.log('Unauthorized - please log in');
        return;
      }
      
      if (response.status === 404) {
        console.log('No profile photo found - camera will be enabled');
        // 404 means no photo saved yet, so camera should be enabled
        setShowPhotoCapture(false); // Don't auto-show capture, but allow them to click button
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setProfilePhoto(data.photo);
          setFaceRegistered(data.faceRegistered);
          setShowPhotoCapture(false); // Photo exists, don't show capture
        }
      }
    } catch (error) {
      console.log('Error loading photo - camera will be enabled');
      // On error, allow camera capture
    }
  };

  const handlePhotoSaved = (photo: string) => {
    setProfilePhoto(photo);
    setFaceRegistered(true);
    setShowPhotoCapture(false);
    toast.success('Profile photo saved! You can now start interviews.');
  };

  return (
    <>
      <DashboardLayout navItems={navItems} title="PROFILE">
        <div className="max-w-3xl space-y-6">
          {/* Progress */}
          <GlassCard variant="neon" hover={false}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Profile Completion</span>
              <span className="text-sm text-primary font-mono">{profileCompletion}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted/50">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-primary to-neon-cyan transition-all duration-500 ease-out" 
                style={{ width: `${profileCompletion}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {profileCompletion === 0 && "Start by filling in your personal details"}
              {profileCompletion > 0 && profileCompletion < 50 && "Good start! Keep adding more information"}
              {profileCompletion >= 50 && profileCompletion < 100 && "Almost there! Just a few more fields to complete"}
              {profileCompletion === 100 && "Perfect! Your profile is complete"}
            </p>
          </GlassCard>

          {/* Profile Photo Section */}
          <GlassCard variant="neon" hover={false}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-foreground font-semibold">Profile Photo</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Required for identity verification before interviews
                </p>
              </div>
              {faceRegistered && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-green-400 font-medium">Verified</span>
                </div>
              )}
            </div>

            {/* Always show camera if photo not saved, even after refresh */}
            {profilePhoto && !showPhotoCapture ? (
              /* Photo is saved - show preview */
              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Photo Preview */}
                <div className="relative">
                  <img 
                    src={profilePhoto} 
                    alt="Profile" 
                    className="w-40 h-40 rounded-xl object-cover border-2 border-border/50"
                  />
                  {faceRegistered && (
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-2 border-background">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>

                {/* Info and Actions */}
                <div className="flex-1 text-center md:text-left">
                  <p className="text-sm text-foreground mb-2">
                    Your profile photo has been saved and verified.
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    This photo will be used for identity verification before interviews.
                  </p>
                  <button
                    onClick={() => setShowPhotoCapture(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border/50 text-foreground hover:bg-muted/30 transition-all text-sm"
                  >
                    <Camera className="w-4 h-4" />
                    Update Photo
                  </button>
                </div>
              </div>
            ) : (
              /* No photo saved OR updating photo - show camera */
              <div className="py-4">
                <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 text-center">
                    ⚠️ Profile photo is required. Please capture and save your photo to continue.
                  </p>
                </div>
                <ProfilePhotoCapture onPhotoSaved={handlePhotoSaved} />
              </div>
            )}
          </GlassCard>

          {/* Form */}
          <GlassCard variant="neon" hover={false}>
            <h3 className="text-foreground font-semibold mb-6">Personal Details *</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                  Full Name * {isFieldInvalid('full name') && <span className="text-destructive">*</span>}
                </label>
                <input
                  value={profileData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  placeholder="John Doe"
                  className={`w-full px-4 py-3 rounded-lg bg-muted/30 border text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-all ${
                    isFieldInvalid('full name') 
                      ? 'border-destructive/50 focus:border-destructive' 
                      : 'border-border/50 focus:border-primary/50'
                  }`}
                />
                {isFieldInvalid('full name') && (
                  <p className="text-xs text-destructive mt-1">{getFieldError('full name')}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                  Email ID * {isFieldInvalid('email') && <span className="text-destructive">*</span>}
                </label>
                <input
                  value={profileData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="john@example.com"
                  type="email"
                  className={`w-full px-4 py-3 rounded-lg bg-muted/30 border text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-all ${
                    isFieldInvalid('email') 
                      ? 'border-destructive/50 focus:border-destructive' 
                      : 'border-border/50 focus:border-primary/50'
                  }`}
                />
                {isFieldInvalid('email') && (
                  <p className="text-xs text-destructive mt-1">{getFieldError('email')}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                  Country * {isFieldInvalid('country') && <span className="text-destructive">*</span>}
                </label>
                <select
                  value={profileData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg bg-muted/30 border text-foreground focus:outline-none transition-all ${
                    isFieldInvalid('country') 
                      ? 'border-destructive/50 focus:border-destructive' 
                      : 'border-border/50 focus:border-primary/50'
                  }`}
                >
                  <option value="">Select Country</option>
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="India">India</option>
                  <option value="Canada">Canada</option>
                  <option value="Australia">Australia</option>
                  <option value="Germany">Germany</option>
                  <option value="France">France</option>
                  <option value="Singapore">Singapore</option>
                  <option value="Japan">Japan</option>
                  <option value="Other">Other</option>
                </select>
                {isFieldInvalid('country') && (
                  <p className="text-xs text-destructive mt-1">{getFieldError('country')}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                  Mobile Number * {isFieldInvalid('phone') && <span className="text-destructive">*</span>}
                </label>
                <input
                  value={profileData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+1 234 567 890"
                  className={`w-full px-4 py-3 rounded-lg bg-muted/30 border text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-all ${
                    isFieldInvalid('phone') 
                      ? 'border-destructive/50 focus:border-destructive' 
                      : 'border-border/50 focus:border-primary/50'
                  }`}
                />
                {isFieldInvalid('phone') && (
                  <p className="text-xs text-destructive mt-1">{getFieldError('phone')}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                  Date of Birth * {isFieldInvalid('date of birth') && <span className="text-destructive">*</span>}
                </label>
                <input
                  value={profileData.dateOfBirth || ''}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  type="date"
                  className={`w-full px-4 py-3 rounded-lg bg-muted/30 border text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-all ${
                    isFieldInvalid('date of birth') 
                      ? 'border-destructive/50 focus:border-destructive' 
                      : 'border-border/50 focus:border-primary/50'
                  }`}
                />
                {isFieldInvalid('date of birth') && (
                  <p className="text-xs text-destructive mt-1">{getFieldError('date of birth')}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                  Gender * {isFieldInvalid('gender') && <span className="text-destructive">*</span>}
                </label>
                <select
                  value={profileData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg bg-muted/30 border text-foreground focus:outline-none transition-all ${
                    isFieldInvalid('gender') 
                      ? 'border-destructive/50 focus:border-destructive' 
                      : 'border-border/50 focus:border-primary/50'
                  }`}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
                {isFieldInvalid('gender') && (
                  <p className="text-xs text-destructive mt-1">{getFieldError('gender')}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                  Address * {isFieldInvalid('address') && <span className="text-destructive">*</span>}
                </label>
                <textarea
                  value={profileData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="123 Main St, City, State, Country"
                  rows={3}
                  className={`w-full px-4 py-3 rounded-lg bg-muted/30 border text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-all resize-none ${
                    isFieldInvalid('address') 
                      ? 'border-destructive/50 focus:border-destructive' 
                      : 'border-border/50 focus:border-primary/50'
                  }`}
                />
                {isFieldInvalid('address') && (
                  <p className="text-xs text-destructive mt-1">{getFieldError('address')}</p>
                )}
              </div>
            </div>
          </GlassCard>

          {/* Education Section - Mandatory */}
          <GlassCard variant="neon" hover={false}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-foreground font-semibold">Education *</h3>
              <button
                onClick={() => {
                  const newEducation = {
                    institutionName: '',
                    degree: '',
                    startYear: '',
                    endYear: '',
                    percentage: '',
                    grade: '',
                    cgpa: '',
                    cgpaScale: '10'
                  };
                  updateProfile('education', [...profileData.education, newEducation] as any);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Education
              </button>
            </div>

            {profileData.education.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No education records added yet</p>
                <p className="text-xs mt-1">Click "Add Education" to add your education details</p>
              </div>
            ) : (
              <div className="space-y-4">
                {profileData.education.map((edu, index) => (
                  <div key={index} className="p-4 rounded-lg bg-muted/10 border border-border/30">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-foreground">Education {index + 1}</span>
                      <button
                        onClick={() => {
                          const updatedEducation = profileData.education.filter((_, i) => i !== index);
                          updateProfile('education', updatedEducation as any);
                        }}
                        className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="md:col-span-2">
                        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                          Institution Name *
                        </label>
                        <input
                          value={edu.institutionName}
                          onChange={(e) => {
                            const updated = [...profileData.education];
                            updated[index].institutionName = e.target.value;
                            updateProfile('education', updated as any);
                          }}
                          placeholder="e.g., Massachusetts Institute of Technology"
                          className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                          Degree
                        </label>
                        <input
                          value={edu.degree}
                          onChange={(e) => {
                            const updated = [...profileData.education];
                            updated[index].degree = e.target.value;
                            updateProfile('education', updated as any);
                          }}
                          placeholder="e.g., Bachelor of Science in Computer Science"
                          className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                            Start Year
                          </label>
                          <input
                            value={edu.startYear}
                            onChange={(e) => {
                              const updated = [...profileData.education];
                              updated[index].startYear = e.target.value;
                              updateProfile('education', updated as any);
                            }}
                            type="number"
                            placeholder="2018"
                            className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                            End Year
                          </label>
                          <input
                            value={edu.endYear}
                            onChange={(e) => {
                              const updated = [...profileData.education];
                              updated[index].endYear = e.target.value;
                              updateProfile('education', updated as any);
                            }}
                            type="number"
                            placeholder="2022"
                            className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                          Percentage
                        </label>
                        <input
                          value={edu.percentage}
                          onChange={(e) => {
                            const updated = [...profileData.education];
                            updated[index].percentage = e.target.value;
                            updateProfile('education', updated as any);
                          }}
                          type="number"
                          placeholder="85"
                          className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                          Grade
                        </label>
                        <input
                          value={edu.grade}
                          onChange={(e) => {
                            const updated = [...profileData.education];
                            updated[index].grade = e.target.value;
                            updateProfile('education', updated as any);
                          }}
                          placeholder="A"
                          className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                            CGPA
                          </label>
                          <input
                            value={edu.cgpa}
                            onChange={(e) => {
                              const updated = [...profileData.education];
                              updated[index].cgpa = e.target.value;
                              updateProfile('education', updated as any);
                            }}
                            type="number"
                            step="0.1"
                            placeholder="9.5"
                            className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                            Scale
                          </label>
                          <select
                            value={edu.cgpaScale}
                            onChange={(e) => {
                              const updated = [...profileData.education];
                              updated[index].cgpaScale = e.target.value;
                              updateProfile('education', updated as any);
                            }}
                            className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-foreground focus:outline-none focus:border-primary/50 text-sm"
                          >
                            <option value="4">4</option>
                            <option value="5">5</option>
                            <option value="10">10</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {isFieldInvalid('education') && (
              <p className="text-xs text-destructive mt-2">{getFieldError('education')}</p>
            )}
          </GlassCard>

          {/* Skills Section - Mandatory */}
          <GlassCard variant="neon" hover={false}>
            <h3 className="text-foreground font-semibold mb-4">Skills *</h3>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {profileData.skills.map((skill, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20"
                >
                  <span className="text-sm">{skill}</span>
                  <button
                    onClick={() => {
                      const updatedSkills = profileData.skills.filter((_, i) => i !== index);
                      updateProfile('skills', updatedSkills as any);
                    }}
                    className="p-0.5 rounded hover:bg-primary/20 transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && newSkill.trim() && (() => {
                  updateProfile('skills', [...profileData.skills, newSkill.trim()] as any);
                  setNewSkill('');
                })()}
                placeholder="Enter a skill..."
                className="flex-1 px-3 py-2 rounded-lg bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 text-sm"
              />
              <button
                onClick={() => {
                  if (newSkill.trim()) {
                    updateProfile('skills', [...profileData.skills, newSkill.trim()] as any);
                    setNewSkill('');
                  }
                }}
                disabled={!newSkill.trim()}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {isFieldInvalid('skills') && (
              <p className="text-xs text-destructive mt-2">{getFieldError('skills')}</p>
            )}
          </GlassCard>

          {/* Experience Section - Optional */}
          <GlassCard variant="neon" hover={false}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-foreground font-semibold">Experience (Optional)</h3>
              <button
                onClick={() => {
                  const newExperience = {
                    startDate: '',
                    endDate: '',
                    currentlyWorking: false,
                    companyName: '',
                    jobRole: '',
                    description: ''
                  };
                  updateProfile('experience', [...profileData.experience, newExperience] as any);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Experience
              </button>
            </div>

            {profileData.experience.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No experience records added yet</p>
                <p className="text-xs mt-1">Click "Add Experience" to add your work experience</p>
              </div>
            ) : (
              <div className="space-y-4">
                {profileData.experience.map((exp, index) => (
                  <div key={index} className="p-4 rounded-lg bg-muted/10 border border-border/30">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-foreground">Experience {index + 1}</span>
                      <button
                        onClick={() => {
                          const updatedExperience = profileData.experience.filter((_, i) => i !== index);
                          updateProfile('experience', updatedExperience as any);
                        }}
                        className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                          Start Date
                        </label>
                        <input
                          value={exp.startDate}
                          onChange={(e) => {
                            const updated = [...profileData.experience];
                            updated[index].startDate = e.target.value;
                            updateProfile('experience', updated as any);
                          }}
                          type="date"
                          className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-foreground focus:outline-none focus:border-primary/50 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                          End Date
                        </label>
                        <input
                          value={exp.endDate}
                          onChange={(e) => {
                            const updated = [...profileData.experience];
                            updated[index].endDate = e.target.value;
                            updateProfile('experience', updated as any);
                          }}
                          type="date"
                          disabled={exp.currentlyWorking}
                          className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-foreground focus:outline-none focus:border-primary/50 text-sm disabled:opacity-50"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-1">
                          <input
                            type="checkbox"
                            checked={exp.currentlyWorking}
                            onChange={(e) => {
                              const updated = [...profileData.experience];
                              updated[index].currentlyWorking = e.target.checked;
                              if (e.target.checked) {
                                updated[index].endDate = '';
                              }
                              updateProfile('experience', updated as any);
                            }}
                            className="rounded border-border/50"
                          />
                          Currently Working Here
                        </label>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                          Company Name
                        </label>
                        <input
                          value={exp.companyName}
                          onChange={(e) => {
                            const updated = [...profileData.experience];
                            updated[index].companyName = e.target.value;
                            updateProfile('experience', updated as any);
                          }}
                          placeholder="e.g., Google"
                          className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                          Job Role
                        </label>
                        <input
                          value={exp.jobRole}
                          onChange={(e) => {
                            const updated = [...profileData.experience];
                            updated[index].jobRole = e.target.value;
                            updateProfile('experience', updated as any);
                          }}
                          placeholder="e.g., Software Engineer"
                          className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 text-sm"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                          Description
                        </label>
                        <textarea
                          value={exp.description}
                          onChange={(e) => {
                            const updated = [...profileData.experience];
                            updated[index].description = e.target.value;
                            updateProfile('experience', updated as any);
                          }}
                          placeholder="Describe your responsibilities and achievements..."
                          rows={3}
                          className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 text-sm resize-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Projects Section - Optional */}
          <GlassCard variant="neon" hover={false}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-foreground font-semibold">Projects (Optional)</h3>
              <button
                onClick={() => {
                  const newProject = {
                    projectTitle: '',
                    techStack: [],
                    description: ''
                  };
                  updateProfile('projects', [...profileData.projects, newProject] as any);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Project
              </button>
            </div>

            {profileData.projects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No projects added yet</p>
                <p className="text-xs mt-1">Click "Add Project" to showcase your projects</p>
              </div>
            ) : (
              <div className="space-y-4">
                {profileData.projects.map((project, index) => (
                  <div key={index} className="p-4 rounded-lg bg-muted/10 border border-border/30">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-foreground">Project {index + 1}</span>
                      <button
                        onClick={() => {
                          const updatedProjects = profileData.projects.filter((_, i) => i !== index);
                          updateProfile('projects', updatedProjects as any);
                        }}
                        className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                          Project Title
                        </label>
                        <input
                          value={project.projectTitle}
                          onChange={(e) => {
                            const updated = [...profileData.projects];
                            updated[index].projectTitle = e.target.value;
                            updateProfile('projects', updated as any);
                          }}
                          placeholder="e.g., E-commerce Platform"
                          className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                          Tech Stack
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {project.techStack.map((tech, techIndex) => (
                            <div
                              key={techIndex}
                              className="flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20 text-xs"
                            >
                              <span>{tech}</span>
                              <button
                                onClick={() => {
                                  const updated = [...profileData.projects];
                                  updated[index].techStack = updated[index].techStack.filter((_, i) => i !== techIndex);
                                  console.log('[Profile] Removing techStack at index:', techIndex);
                                  console.log('[Profile] Updated project:', updated[index]);
                                  updateProfile('projects', updated as any);
                                }}
                                className="p-0.5 rounded hover:bg-primary/20"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <input
                          type="text"
                          placeholder="Add technology (press Enter, or use commas: Python, JavaScript)"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              const target = e.target as HTMLInputElement;
                              if (target.value.trim()) {
                                const updated = [...profileData.projects];
                                // Split by comma to support multiple technologies
                                const inputValue = target.value;
                                const newTechs = inputValue.split(',').map(t => t.trim()).filter(t => t);
                                console.log('[Profile] Input value:', inputValue);
                                console.log('[Profile] Split techs:', newTechs);
                                console.log('[Profile] Current techStack:', updated[index].techStack);
                                updated[index].techStack = [...updated[index].techStack, ...newTechs];
                                console.log('[Profile] Updated techStack:', updated[index].techStack);
                                updateProfile('projects', updated as any);
                                target.value = '';
                              }
                            }
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                          Description
                        </label>
                        <textarea
                          value={project.description}
                          onChange={(e) => {
                            const updated = [...profileData.projects];
                            updated[index].description = e.target.value;
                            updateProfile('projects', updated as any);
                          }}
                          placeholder="Describe your project..."
                          rows={3}
                          className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 text-sm resize-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Achievements Section - Optional */}
          <GlassCard variant="neon" hover={false}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-foreground font-semibold">Achievements (Optional)</h3>
              <button
                onClick={() => {
                  const newAchievement = {
                    title: '',
                    description: '',
                    date: ''
                  };
                  updateProfile('achievements', [...profileData.achievements, newAchievement] as any);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Achievement
              </button>
            </div>

            {profileData.achievements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No achievements added yet</p>
                <p className="text-xs mt-1">Click "Add Achievement" to highlight your accomplishments</p>
              </div>
            ) : (
              <div className="space-y-4">
                {profileData.achievements.map((achievement, index) => (
                  <div key={index} className="p-4 rounded-lg bg-muted/10 border border-border/30">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-foreground">Achievement {index + 1}</span>
                      <button
                        onClick={() => {
                          const updatedAchievements = profileData.achievements.filter((_, i) => i !== index);
                          updateProfile('achievements', updatedAchievements as any);
                        }}
                        className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="md:col-span-2">
                        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                          Title
                        </label>
                        <input
                          value={achievement.title}
                          onChange={(e) => {
                            const updated = [...profileData.achievements];
                            updated[index].title = e.target.value;
                            updateProfile('achievements', updated as any);
                          }}
                          placeholder="e.g., Best Employee of the Year"
                          className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                          Date/Year
                        </label>
                        <input
                          value={achievement.date}
                          onChange={(e) => {
                            const updated = [...profileData.achievements];
                            updated[index].date = e.target.value;
                            updateProfile('achievements', updated as any);
                          }}
                          type="date"
                          className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-foreground focus:outline-none focus:border-primary/50 text-sm"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                          Description
                        </label>
                        <textarea
                          value={achievement.description}
                          onChange={(e) => {
                            const updated = [...profileData.achievements];
                            updated[index].description = e.target.value;
                            updateProfile('achievements', updated as any);
                          }}
                          placeholder="Describe your achievement..."
                          rows={2}
                          className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 text-sm resize-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Additional Sections - Optional */}
          <GlassCard variant="neon" hover={false}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-foreground font-semibold">Additional Sections (Optional)</h3>
              <button
                onClick={() => setShowAdditionalSectionModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Section
              </button>
            </div>

            {profileData.additionalSections.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No additional sections added yet</p>
                <p className="text-xs mt-1">Click "Add Section" to add custom sections like Certifications, Languages, etc.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {profileData.additionalSections.map((section, index) => (
                  <div key={index} className="p-4 rounded-lg bg-muted/10 border border-border/30">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-foreground">{section.sectionName}</span>
                      <button
                        onClick={() => {
                          const updatedSections = profileData.additionalSections.filter((_, i) => i !== index);
                          updateProfile('additionalSections', updatedSections as any);
                        }}
                        className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea
                      value={typeof section.content === 'string' ? section.content : JSON.stringify(section.content)}
                      onChange={(e) => {
                        const updated = [...profileData.additionalSections];
                        updated[index].content = e.target.value;
                        updateProfile('additionalSections', updated as any);
                      }}
                      placeholder="Enter content for this section..."
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 text-sm resize-none"
                    />
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Additional Section Modal */}
          {showAdditionalSectionModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-background rounded-lg border border-border/30 w-full max-w-md p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Add Custom Section</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                      Section Name
                    </label>
                    <input
                      value={newSectionName}
                      onChange={(e) => setNewSectionName(e.target.value)}
                      placeholder="e.g., Certifications, Languages"
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                      Content
                    </label>
                    <textarea
                      value={newSectionContent}
                      onChange={(e) => setNewSectionContent(e.target.value)}
                      placeholder="Enter the content..."
                      rows={4}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 text-sm resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddAdditionalSection}
                      disabled={!newSectionName.trim() || !newSectionContent.trim()}
                      className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Section
                    </button>
                    <button
                      onClick={() => {
                        setShowAdditionalSectionModal(false);
                        setNewSectionName('');
                        setNewSectionContent('');
                      }}
                      className="flex-1 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-all text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button 
            onClick={handleSave}
            disabled={isSubmitting}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-primary to-neon-cyan text-primary-foreground font-semibold text-sm tracking-wide hover:shadow-[0_0_30px_hsl(185_100%_50%/0.4)] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Profile
              </>
            )}
          </button>
        </div>
      </DashboardLayout>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg border border-border/30 w-full max-w-md p-8 text-center">
            {/* Dynamic Green Tick Mark */}
            <div className="mb-4 flex justify-center">
              <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center animate-bounce">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            {/* Name */}
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {profileData.fullName || 'Your Name'}
            </h3>

            {/* Success Message */}
            <p className="text-sm text-muted-foreground mb-6">
              Your Profile is saved Successfully
            </p>

            {/* Profile Completion Info */}
            <p className="text-xs text-muted-foreground mb-6">
              Profile completion: {profileCompletion}%
            </p>

            {/* OK Button */}
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default CandidateProfile;
