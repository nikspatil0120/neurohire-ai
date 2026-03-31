import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { LayoutDashboard, Target, Building2, FileText, User, LogOut, Upload, Save, Eye, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { useProfile } from "@/contexts/ProfileContext";
import mammoth from "mammoth";

const navItems = [
  { label: "Dashboard", href: "/candidate/dashboard", icon: LayoutDashboard },
  { label: "Practice", href: "/candidate/practice", icon: Target },
  { label: "Company Interviews", href: "/candidate/interviews", icon: Building2 },
  { label: "Reports", href: "/candidate/reports", icon: FileText },
  { label: "Profile", href: "/candidate/profile", icon: User },
  { label: "Logout", href: "/login", icon: LogOut },
];

const CandidateProfile = () => {
  const { profileData, profileCompletion, updateProfile, setResume, uploadResume, isLoading, setProfileData } = useProfile();
  const [roles, setRoles] = useState<string[]>(['Web Developer', 'Data Scientist', 'AI Engineer']);
  const [customRole, setCustomRole] = useState('');
  const [showCustomRoleInput, setShowCustomRoleInput] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: keyof typeof profileData, value: string) => {
    updateProfile(field, value);
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
      errors.push('Phone number is required');
    } else if (!/^\+?[\d\s\-()]+$/.test(profileData.phone)) {
      errors.push('Please enter a valid phone number');
    }
    
    if (!profileData.location.trim()) {
      errors.push('Address is required');
    }
    
    if (!profileData.address) {
      errors.push('Date of Birth is required');
    }
    
    if (!profileData.resume && !profileData.resumeInfo) {
      errors.push('Resume is required');
    }
    
    const currentRoles = profileData.skills ? profileData.skills.split(', ').filter(r => r) : [];
    if (currentRoles.length === 0) {
      errors.push('Please select at least one role');
    }
    
    return errors;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      if (file.type !== 'application/pdf' && !file.type.includes('word')) {
        toast.error('Only PDF and DOCX files are allowed');
        return;
      }
      
      try {
        // Upload to backend
        await uploadResume(file);
        toast.success('Resume uploaded successfully');
      } catch (error: any) {
        console.error('Resume upload error:', error);
        toast.error(error.message || 'Failed to upload resume');
      }
    }
  };

  const handleViewResume = () => {
    if (profileData.resume) {
      // Open the file object in a new tab
      const fileURL = URL.createObjectURL(profileData.resume);
      window.open(fileURL, '_blank');
    } else if (profileData.resumeInfo) {
      // Download the file from the server
      const downloadUrl = `http://localhost:5000/api/auth/download-resume/${profileData.resumeInfo.filename}`;
      window.open(downloadUrl, '_blank');
    }
  };

  const handleRemoveResume = () => {
    setResume(null);
    // Also clear resume info
    setProfileData(prev => ({
      ...prev,
      resume: null,
      resumeInfo: null
    }));
    toast.success('Resume removed successfully');
  };

  const handleRoleToggle = (role: string) => {
    const currentRoles = profileData.skills ? profileData.skills.split(', ').filter(r => r) : [];
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter(r => r !== role)
      : [...currentRoles, role];
    updateProfile('skills', newRoles.join(', '));
  };

  const handleAddCustomRole = () => {
    if (customRole.trim()) {
      const currentRoles = profileData.skills ? profileData.skills.split(', ').filter(r => r) : [];
      if (!currentRoles.includes(customRole.trim())) {
        const newRoles = [...currentRoles, customRole.trim()];
        updateProfile('skills', newRoles.join(', '));
        toast.success('Role added successfully');
      } else {
        toast.error('This role already exists');
      }
      setCustomRole('');
      setShowCustomRoleInput(false);
    }
  };

  const isRoleSelected = (role: string) => {
    const currentRoles = profileData.skills ? profileData.skills.split(', ').filter(r => r) : [];
    return currentRoles.includes(role);
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
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Save to localStorage as persistence
      const profileToSave = {
        ...profileData,
        savedAt: new Date().toISOString(),
        completion: profileCompletion
      };
      localStorage.setItem('candidateProfile', JSON.stringify(profileToSave));
      
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

  const getFieldError = (fieldName: string) => {
    return formErrors.find(error => error.toLowerCase().includes(fieldName.toLowerCase()));
  };

  const isFieldInvalid = (fieldName: string) => {
    return formErrors.some(error => error.toLowerCase().includes(fieldName.toLowerCase()));
  };

  // Load saved profile on component mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('candidateProfile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        // Update all fields from saved profile
        Object.keys(parsed).forEach(key => {
          if (key !== 'savedAt' && key !== 'completion' && key !== 'resume') {
            updateProfile(key as keyof typeof profileData, parsed[key]);
          }
        });
        
        // Handle resume file (can't be stored in localStorage, so we skip it)
        if (parsed.resumeFileName) {
          toast.info('Resume file was not preserved. Please upload it again.');
        }
        
        console.log('Profile loaded from localStorage');
      } catch (error) {
        console.error('Error loading saved profile:', error);
      }
    }
  }, []);

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

          {/* Form */}
          <GlassCard variant="neon" hover={false}>
            <h3 className="text-foreground font-semibold mb-6">Personal Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                  Full Name {isFieldInvalid('full name') && <span className="text-destructive">*</span>}
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
                  Email {isFieldInvalid('email') && <span className="text-destructive">*</span>}
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
                  Phone {isFieldInvalid('phone') && <span className="text-destructive">*</span>}
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
                  Address {isFieldInvalid('address') && <span className="text-destructive">*</span>}
                </label>
                <input
                  value={profileData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="123 Main St, City, State"
                  className={`w-full px-4 py-3 rounded-lg bg-muted/30 border text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-all ${
                    isFieldInvalid('address') 
                      ? 'border-destructive/50 focus:border-destructive' 
                      : 'border-border/50 focus:border-primary/50'
                  }`}
                />
                {isFieldInvalid('address') && (
                  <p className="text-xs text-destructive mt-1">{getFieldError('address')}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                  Date of Birth {isFieldInvalid('date of birth') && <span className="text-destructive">*</span>}
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
            </div>
          </GlassCard>

          <GlassCard variant="neon" hover={false}>
            <h3 className="text-foreground font-semibold mb-4">
              Resume {isFieldInvalid('resume') && <span className="text-destructive">*</span>}
            </h3>
            <input
              type="file"
              id="resume-upload"
              className="hidden"
              accept=".pdf,.doc,.docx"
              onChange={handleFileUpload}
              disabled={isLoading}
            />
            
            {(profileData.resume || profileData.resumeInfo) ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/30">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm text-foreground font-medium">
                        {profileData.resume?.name || profileData.resumeInfo?.originalName || 'Resume'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {profileData.resume 
                          ? `${(profileData.resume.size / 1024 / 1024).toFixed(2)} MB • ${profileData.resume.type}`
                          : profileData.resumeInfo 
                            ? `${(profileData.resumeInfo.size / 1024 / 1024).toFixed(2)} MB • Uploaded ${new Date(profileData.resumeInfo.uploadedAt).toLocaleDateString()}`
                            : 'Resume file'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleViewResume}
                      className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all"
                      title="View Resume"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleRemoveResume}
                      className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all"
                      title="Remove Resume"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <label 
                  htmlFor="resume-upload"
                  className={`block border-2 border-dashed border-border/50 rounded-lg p-4 text-center hover:border-primary/40 transition-colors ${isLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Uploading...</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Click to replace resume</p>
                      <p className="text-xs text-muted-foreground/50 mt-1">PDF, DOCX up to 5MB</p>
                    </>
                  )}
                </label>
              </div>
            ) : (
              <label 
                htmlFor="resume-upload"
                className={`block border-2 border-dashed border-border/50 rounded-lg p-8 text-center hover:border-primary/40 transition-colors ${isLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
              >
                {isLoading ? (
                  <>
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-sm text-muted-foreground">Uploading resume...</p>
                    <p className="text-xs text-muted-foreground/50 mt-1">Please wait</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Drag & drop your resume or click to browse</p>
                    <p className="text-xs text-muted-foreground/50 mt-1">PDF, DOCX up to 5MB</p>
                  </>
                )}
              </label>
            )}
          </GlassCard>

          {isFieldInvalid('resume') && (
            <p className="text-xs text-destructive">{getFieldError('resume')}</p>
          )}

          <GlassCard variant="neon" hover={false}>
            <h3 className="text-foreground font-semibold mb-4">
              Roles you are looking for {isFieldInvalid('role') && <span className="text-destructive">*</span>}
            </h3>
            
            {/* Predefined Roles */}
            <div className="flex flex-wrap gap-2 mb-4">
              {roles.map((role) => (
                <button
                  key={role}
                  onClick={() => handleRoleToggle(role)}
                  className={`px-4 py-2 rounded-lg border transition-all text-sm font-medium ${
                    isRoleSelected(role)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/30 text-muted-foreground border-border/50 hover:border-primary/50 hover:text-foreground'
                  }`}
                >
                  {role}
                </button>
              ))}
              
              {/* Add Custom Role Button */}
              <button
                onClick={() => setShowCustomRoleInput(!showCustomRoleInput)}
                className="px-4 py-2 rounded-lg border border-dashed border-border/50 bg-muted/10 text-muted-foreground hover:border-primary/50 hover:text-primary transition-all text-sm font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Role
              </button>
            </div>

            {/* Custom Role Input */}
            {showCustomRoleInput && (
              <div className="flex gap-2 p-3 bg-muted/10 rounded-lg border border-border/30">
                <input
                  type="text"
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  placeholder="Enter custom role..."
                  className="flex-1 px-3 py-2 rounded bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCustomRole()}
                />
                <button
                  onClick={handleAddCustomRole}
                  className="px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-sm font-medium"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowCustomRoleInput(false);
                    setCustomRole('');
                  }}
                  className="px-4 py-2 rounded bg-muted text-muted-foreground hover:bg-muted/80 transition-all text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Selected Roles Display */}
            {profileData.skills && (
              <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-xs text-primary">
                  <strong>Selected roles:</strong> {profileData.skills.split(', ').filter(r => r).join(', ') || 'None selected'}
                </p>
              </div>
            )}
          </GlassCard>

          {isFieldInvalid('role') && (
            <p className="text-xs text-destructive">{getFieldError('role')}</p>
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
