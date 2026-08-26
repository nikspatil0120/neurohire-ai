import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { LayoutDashboard, FilePlus, Database, Trophy, MessageCircle, LogOut, Building2, User, Save, Camera, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { label: "Dashboard", href: "/recruiter/dashboard", icon: LayoutDashboard },
  { label: "Create Job", href: "/recruiter/create-job", icon: FilePlus },
  { label: "Question DB", href: "/recruiter/questions", icon: Database },
  { label: "Rankings", href: "/recruiter/rankings", icon: Trophy },
  { label: "Messages", href: "/recruiter/messages", icon: MessageCircle },
  { label: "Profile", href: "/recruiter/profile", icon: User },
  { label: "Logout", href: "/login", icon: LogOut },
];

const RecruiterProfile = () => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Array<{ _id: string; company_name: string; registration_number: string }>>([]);
  const [companySearchQuery, setCompanySearchQuery] = useState("");
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

  const [profileData, setProfileData] = useState({
    // Organization Details
    organizationName: "",
    organizationLogo: "",
    organizationRegistrationNo: "",
    organizationLocation: "",
    organizationEmail: "",
    organizationOrigin: "",
    organizationDescription: "",
    organizationTelephone: "",
    
    // Recruiter Details
    recruiterName: "",
    recruiterDesignation: "",
    recruiterPhone: "",
    recruiterCompanyMail: "",
  });

  const designationOptions = [
    "CEO",
    "MD",
    "HR",
    "HR Manager",
    "Recruiter",
    "Hiring Manager",
    "Other",
  ];

  useEffect(() => {
    loadRecruiterProfile();
    loadCompanies();
  }, [user]);

  const loadCompanies = async () => {
    try {
      const { api } = await import("@/lib/api");
      const response = await api.getCompanies();
      console.log("Companies response:", response);
      if (response.success && response.data) {
        setCompanies(response.data);
        console.log("Companies loaded:", response.data);
      } else {
        console.error("Failed to load companies:", response);
        // Try to seed companies if none exist
        console.log("Attempting to seed companies...");
        const seedResponse = await api.seedCompanies();
        console.log("Seed response:", seedResponse);
        if (seedResponse.success) {
          // Load companies again after seeding
          const retryResponse = await api.getCompanies();
          if (retryResponse.success && retryResponse.data) {
            setCompanies(retryResponse.data);
            console.log("Companies loaded after seeding:", retryResponse.data);
          }
        }
      }
    } catch (error) {
      console.error("Error loading companies:", error);
    }
  };

  const loadRecruiterProfile = async () => {
    if (user?.email) {
      try {
        console.log("Loading recruiter profile for email:", user.email);
        const { api } = await import("@/lib/api");
        const response = await api.getRecruiterProfileData(user.email);
        console.log("Recruiter profile response:", response);
        if (response.success && response.data) {
          setProfileData(response.data);
          console.log("Profile data loaded:", response.data);
          if (response.data.organizationLogo) {
            setLogoPreview(response.data.organizationLogo);
          }
        } else {
          console.error("Failed to load recruiter profile:", response);
        }
      } catch (error) {
        console.error("Error loading recruiter profile:", error);
      }
    } else {
      console.log("No user email available for loading profile");
    }
  };

  const handleInputChange = (field: keyof typeof profileData, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setLogoPreview(base64String);
        setProfileData(prev => ({ ...prev, organizationLogo: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoRemove = () => {
    setLogoPreview(null);
    setProfileData(prev => ({ ...prev, organizationLogo: "" }));
  };

  const handleCompanySelect = (company: { company_name: string; registration_number: string }) => {
    setProfileData(prev => ({
      ...prev,
      organizationName: company.company_name,
      organizationRegistrationNo: company.registration_number
    }));
    setCompanySearchQuery(company.company_name);
    setShowCompanyDropdown(false);
  };

  const handleCompanySearch = async (query: string) => {
    setCompanySearchQuery(query);
    setProfileData(prev => ({ ...prev, organizationName: query }));
    if (query.length > 0) {
      try {
        const { api } = await import("@/lib/api");
        const response = await api.searchCompanies(query);
        if (response.success && response.data) {
          setCompanies(response.data);
        }
      } catch (error) {
        console.error("Error searching companies:", error);
      }
    } else {
      loadCompanies();
    }
    setShowCompanyDropdown(true);
  };

  const validateForm = () => {
    const errors = [];

    // Organization Details validation
    if (!profileData.organizationName.trim()) {
      errors.push("Organization Name is required");
    }
    if (!profileData.organizationRegistrationNo.trim()) {
      errors.push("Organization Registration No. is required");
    }
    if (!profileData.organizationLocation.trim()) {
      errors.push("Organization Location is required");
    }
    if (!profileData.organizationEmail.trim()) {
      errors.push("Organization Email is required");
    } else if (!/\S+@\S+\.\S+/.test(profileData.organizationEmail)) {
      errors.push("Please enter a valid Organization Email");
    }
    if (!profileData.organizationTelephone.trim()) {
      errors.push("Organization Telephone No. is required");
    } else if (!/^\+?[\d\s\-()]+$/.test(profileData.organizationTelephone)) {
      errors.push("Please enter a valid Telephone Number");
    }

    // Recruiter Details validation
    if (!profileData.recruiterName.trim()) {
      errors.push("Recruiter Name is required");
    }
    if (!profileData.recruiterDesignation.trim()) {
      errors.push("Recruiter Designation is required");
    }
    if (!profileData.recruiterPhone.trim()) {
      errors.push("Recruiter Phone No. is required");
    } else if (!/^\+?[\d\s\-()]+$/.test(profileData.recruiterPhone)) {
      errors.push("Please enter a valid Phone Number");
    }
    if (!profileData.recruiterCompanyMail.trim()) {
      errors.push("Recruiter Company Mail is required");
    } else if (!/\S+@\S+\.\S+/.test(profileData.recruiterCompanyMail)) {
      errors.push("Please enter a valid Company Email");
    }

    return errors;
  };

  const handleSave = async () => {
    setFormErrors([]);
    const errors = validateForm();
    if (errors.length > 0) {
      setFormErrors(errors);
      errors.forEach((error) => toast.error(error));
      return;
    }

    setIsSubmitting(true);
    try {
      toast.loading("Saving profile...", { id: "save-profile" });
      const { api } = await import("@/lib/api");
      await api.updateRecruiterProfile(profileData, user?.email || "");
      toast.success("Profile saved successfully!", { id: "save-profile" });
      setShowSuccessModal(true);
      setFormErrors([]);
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile. Please try again.", { id: "save-profile" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setProfileData({
      organizationName: "",
      organizationLogo: "",
      organizationRegistrationNo: "",
      organizationLocation: "",
      organizationEmail: "",
      organizationOrigin: "",
      organizationDescription: "",
      organizationTelephone: "",
      recruiterName: "",
      recruiterDesignation: "",
      recruiterPhone: "",
      recruiterCompanyMail: "",
    });
    setLogoPreview(null);
    toast.info("Form reset");
  };

  return (
    <DashboardLayout navItems={navItems} title="RECRUITER PROFILE">
      <div className="space-y-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-display font-bold text-foreground mb-6">Recruiter Profile</h1>

        {formErrors.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
            <p className="text-destructive font-semibold mb-2">Please fix the following errors:</p>
            <ul className="list-disc list-inside text-destructive text-sm space-y-1">
              {formErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Organization Details Section */}
        <GlassCard variant="neon" hover={false}>
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Organization Details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Organization Logo */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">
                Organization Logo <span className="text-destructive">*</span>
              </label>
              <div className="flex items-start gap-4">
                {logoPreview ? (
                  <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-border/30 bg-muted/20">
                    <img
                      src={logoPreview}
                      alt="Organization Logo"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={handleLogoRemove}
                      className="absolute top-2 right-2 p-1 bg-destructive/80 rounded-full hover:bg-destructive transition-colors"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-lg border-2 border-dashed border-border/50 bg-muted/10 flex flex-col items-center justify-center">
                    <Building2 className="w-8 h-8 text-muted-foreground/50 mb-2" />
                    <span className="text-xs text-muted-foreground/50">No Logo</span>
                  </div>
                )}
                <div className="flex-1">
                  <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer w-fit">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm font-medium">Upload Logo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-muted-foreground mt-2">Recommended: Square image, max 2MB</p>
                </div>
              </div>
            </div>

            {/* Organization Name */}
            <div className="relative">
              <label className="block text-sm font-medium text-foreground mb-2">
                Organization Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={companySearchQuery || profileData.organizationName}
                onChange={(e) => handleCompanySearch(e.target.value)}
                onFocus={() => setShowCompanyDropdown(true)}
                onBlur={() => setTimeout(() => setShowCompanyDropdown(false), 200)}
                placeholder="Search or enter organization name"
                className="w-full px-4 py-2 rounded-lg bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
              />
              {showCompanyDropdown && companies.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-background border border-border/50 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {companies.map((company) => (
                    <div
                      key={company._id}
                      onClick={() => handleCompanySelect(company)}
                      className="px-4 py-2 hover:bg-muted/20 cursor-pointer transition-colors"
                    >
                      <div className="text-sm font-medium text-foreground">{company.company_name}</div>
                      <div className="text-xs text-muted-foreground">Reg: {company.registration_number}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Organization Registration No. */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Organization Registration No. <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={profileData.organizationRegistrationNo}
                onChange={(e) => handleInputChange("organizationRegistrationNo", e.target.value)}
                placeholder="Auto-filled from company selection"
                className="w-full px-4 py-2 rounded-lg bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                readOnly={companies.some(c => c.company_name === profileData.organizationName)}
              />
              {companies.some(c => c.company_name === profileData.organizationName) && (
                <p className="text-xs text-muted-foreground mt-1">Auto-filled from company database</p>
              )}
            </div>

            {/* Organization Location */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Organization Location <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={profileData.organizationLocation}
                onChange={(e) => handleInputChange("organizationLocation", e.target.value)}
                placeholder="City, State, Country"
                className="w-full px-4 py-2 rounded-lg bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            {/* Organization Origin */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Organization Origin
              </label>
              <input
                type="text"
                value={profileData.organizationOrigin}
                onChange={(e) => handleInputChange("organizationOrigin", e.target.value)}
                placeholder="Country/Region of origin"
                className="w-full px-4 py-2 rounded-lg bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            {/* Organization Email */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Organization Email <span className="text-destructive">*</span>
              </label>
              <input
                type="email"
                value={profileData.organizationEmail}
                onChange={(e) => handleInputChange("organizationEmail", e.target.value)}
                placeholder="organization@example.com"
                className="w-full px-4 py-2 rounded-lg bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            {/* Organization Telephone */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Organization Telephone No. <span className="text-destructive">*</span>
              </label>
              <input
                type="tel"
                value={profileData.organizationTelephone}
                onChange={(e) => handleInputChange("organizationTelephone", e.target.value)}
                placeholder="+1 234 567 8900"
                className="w-full px-4 py-2 rounded-lg bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            {/* Organization Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">
                Organization Description
              </label>
              <textarea
                value={profileData.organizationDescription}
                onChange={(e) => handleInputChange("organizationDescription", e.target.value)}
                placeholder="Provide a brief description of your organization..."
                rows={4}
                className="w-full px-4 py-2 rounded-lg bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors resize-none"
              />
            </div>
          </div>
        </GlassCard>

        {/* Recruiter Details Section */}
        <GlassCard variant="neon" hover={false}>
          <div className="flex items-center gap-2 mb-6">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Recruiter Details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recruiter Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Recruiter Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={profileData.recruiterName}
                onChange={(e) => handleInputChange("recruiterName", e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-2 rounded-lg bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            {/* Recruiter Designation */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Recruiter Designation <span className="text-destructive">*</span>
              </label>
              <select
                value={profileData.recruiterDesignation}
                onChange={(e) => handleInputChange("recruiterDesignation", e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-background border border-border/50 text-foreground focus:outline-none focus:border-primary/50 transition-colors"
              >
                <option value="">Select designation</option>
                {designationOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            {/* Recruiter Phone */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Recruiter Phone No. <span className="text-destructive">*</span>
              </label>
              <input
                type="tel"
                value={profileData.recruiterPhone}
                onChange={(e) => handleInputChange("recruiterPhone", e.target.value)}
                placeholder="+1 234 567 8900"
                className="w-full px-4 py-2 rounded-lg bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            {/* Recruiter Company Mail */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Recruiter Company Mail <span className="text-destructive">*</span>
              </label>
              <input
                type="email"
                value={profileData.recruiterCompanyMail}
                onChange={(e) => handleInputChange("recruiterCompanyMail", e.target.value)}
                placeholder="yourname@company.com"
                className="w-full px-4 py-2 rounded-lg bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>
        </GlassCard>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <button
            onClick={handleReset}
            disabled={isSubmitting}
            className="px-6 py-3 rounded-lg bg-muted/20 text-foreground border border-border/50 hover:bg-muted/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-primary to-neon-cyan text-primary-foreground font-semibold hover:shadow-[0_0_30px_hsl(185_100%_50%/0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Profile
              </>
            )}
          </button>
        </div>

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background border border-border/50 rounded-lg p-6 max-w-md w-full mx-4">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Save className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Profile Saved Successfully!</h3>
                <p className="text-muted-foreground mb-6">Your recruiter profile has been updated.</p>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default RecruiterProfile;
