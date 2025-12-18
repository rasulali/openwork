"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion } from "motion/react";
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Check,
  HelpCircle,
  RotateCcw,
  User,
  FileText,
  Briefcase,
  GraduationCap,
  Wrench,
  Eye,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { getLocalStorage, removeLocalStorage } from "@/utils/localStorage";

// Types
interface MetaResume {
  personal: {
    firstName: string;
    lastName: string;
    headline?: string;
    email: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    summary?: string;
  };
  experience: Array<{
    id: string;
    company: string;
    position: string;
    location?: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    description: string[];
  }>;
  education: Array<{
    id: string;
    institution: string;
    degree: string;
    field: string;
    startDate?: string;
    endDate?: string;
  }>;
  skills: {
    technical?: string[];
    languages?: string[];
  };
}

type SectionName =
  | "personal"
  | "summary"
  | "experience"
  | "education"
  | "skills";
type FragmentName =
  | "name"
  | "contact"
  | "summary"
  | "experience-header"
  | "experience-bullets"
  | "education"
  | "skills";
type SectionStatus = "complete" | "in-progress" | "incomplete";

type Step = {
  key: string;
  section: SectionName;
  fragment: FragmentName;
  fields: string[];
  optional?: boolean;
  multi?: boolean;
};

// Steps configuration
const STEPS: Step[] = [
  {
    key: "name",
    section: "personal",
    fragment: "name",
    fields: ["firstName", "lastName"],
  },
  {
    key: "contact",
    section: "personal",
    fragment: "contact",
    fields: ["email", "phone", "location", "linkedin"],
    optional: true,
  },
  {
    key: "summary",
    section: "summary",
    fragment: "summary",
    fields: ["summary"],
    optional: true,
  },
  {
    key: "experience",
    section: "experience",
    fragment: "experience-header",
    fields: ["company", "position", "startDate", "endDate"],
    multi: true,
  },
  {
    key: "experience-bullets",
    section: "experience",
    fragment: "experience-bullets",
    fields: ["description"],
    multi: true,
  },
  {
    key: "education",
    section: "education",
    fragment: "education",
    fields: ["institution", "degree", "field", "startDate", "endDate"],
    multi: true,
    optional: true,
  },
  {
    key: "skills",
    section: "skills",
    fragment: "skills",
    fields: ["technical", "languages"],
    optional: true,
  },
];

const INITIAL_RESUME: MetaResume = {
  personal: {
    firstName: "",
    lastName: "",
    headline: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    summary: "",
  },
  experience: [
    {
      id: "1",
      company: "",
      position: "",
      location: "",
      startDate: "",
      endDate: "",
      current: false,
      description: [],
    },
  ],
  education: [
    {
      id: "1",
      institution: "",
      degree: "",
      field: "",
      startDate: "",
      endDate: "",
    },
  ],
  skills: { technical: [], languages: [] },
};

const SECTION_ICONS: Record<SectionName, React.ReactNode> = {
  personal: <User className="h-4 w-4" />,
  summary: <FileText className="h-4 w-4" />,
  experience: <Briefcase className="h-4 w-4" />,
  education: <GraduationCap className="h-4 w-4" />,
  skills: <Wrench className="h-4 w-4" />,
};

// Maximum scale limits
const MAX_DESKTOP_SCALE = 1.2; // Reasonable max zoom on desktop
const MAX_MOBILE_SCALE = 2.5; // More aggressive on mobile
const VIEWPORT_PADDING = 0.85; // Use 85% of viewport for the fragment

// Auto-Scaling Layout Configuration
type LayoutConfig = {
  id: string;
  fontSize: number; // Base font size in pt (e.g. 10)
  headerSize: number; // Name font size in pt (e.g. 28)
  roleSize: number; // Role font size in pt (e.g. 12)
  sectionHeaderSize: number; // Section title size in pt (e.g. 11)
  sectionMargin: number; // Margin bottom for sections in px
  itemMargin: number; // Margin bottom for items in px
  lineHeight: number; // CSS line-height unitless
  padding: number; // Page padding in mm
  gap: number; // Gap between elements in px
};

const DENSITY_PRESETS: LayoutConfig[] = [
  {
    id: "standard",
    fontSize: 10,
    headerSize: 28,
    roleSize: 12,
    sectionHeaderSize: 11,
    sectionMargin: 24, // mb-6
    itemMargin: 8, // space-y-2 -> ~8px
    lineHeight: 1.5, // leading-relaxed
    padding: 20, // 20mm
    gap: 8,
  },
  {
    id: "compact",
    fontSize: 9.5,
    headerSize: 24,
    roleSize: 11,
    sectionHeaderSize: 10.5,
    sectionMargin: 16,
    itemMargin: 6,
    lineHeight: 1.4,
    padding: 18,
    gap: 6,
  },
  {
    id: "dense",
    fontSize: 9,
    headerSize: 22,
    roleSize: 11,
    sectionHeaderSize: 10,
    sectionMargin: 12,
    itemMargin: 4,
    lineHeight: 1.35,
    padding: 15,
    gap: 4,
  },
  {
    id: "ultra-dense",
    fontSize: 8.5,
    headerSize: 20,
    roleSize: 10,
    sectionHeaderSize: 9.5,
    sectionMargin: 8,
    itemMargin: 3,
    lineHeight: 1.3,
    padding: 12,
    gap: 3,
  },
];

const parseDateValue = (value?: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const formatDateValue = (value?: string, placeholder = "Select date") => {
  const date = parseDateValue(value);
  if (!date) return placeholder;
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

const hasText = (value?: string) => Boolean(value?.trim());
const hasItems = (values?: string[]) => (values?.length ?? 0) > 0;

const isExperienceHeaderComplete = (exp: MetaResume["experience"][number]) =>
  hasText(exp.company) &&
  hasText(exp.position) &&
  hasText(exp.startDate) &&
  (exp.current || hasText(exp.endDate));

const isExperienceEntryComplete = (exp: MetaResume["experience"][number]) =>
  isExperienceHeaderComplete(exp) && hasItems(exp.description);

const hasExperienceData = (exp: MetaResume["experience"][number]) =>
  hasText(exp.company) ||
  hasText(exp.position) ||
  hasText(exp.location) ||
  hasText(exp.startDate) ||
  hasText(exp.endDate) ||
  hasItems(exp.description);

const isEducationComplete = (edu: MetaResume["education"][number]) =>
  hasText(edu.institution) && hasText(edu.degree) && hasText(edu.field);

const hasEducationData = (edu: MetaResume["education"][number]) =>
  hasText(edu.institution) ||
  hasText(edu.degree) ||
  hasText(edu.field) ||
  hasText(edu.startDate) ||
  hasText(edu.endDate);

export default function BuilderPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [resume, setResume] = useState<MetaResume>(INITIAL_RESUME);
  const [currentExpIndex, setCurrentExpIndex] = useState(0);
  const [currentEduIndex, setCurrentEduIndex] = useState(0);
  const [tempBullet, setTempBullet] = useState("");
  const [tempTechnicalSkill, setTempTechnicalSkill] = useState("");
  const [tempLanguage, setTempLanguage] = useState("");
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const fragmentRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const resumeContainerRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [zoomTransform, setZoomTransform] = useState({
    y: 0,
    scale: 0.5,
    yPixels: 0,
  });
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const uploadedResumeData = getLocalStorage("resume_upload");

    if (uploadedResumeData) {
      try {
        console.log("Found resume_upload in localStorage, parsing...");
        const parsedResume = JSON.parse(uploadedResumeData);

        // Validate that it has the correct structure
        if (
          parsedResume.personal &&
          parsedResume.experience &&
          parsedResume.education &&
          parsedResume.skills
        ) {
          console.log("Loaded resume from upload:", parsedResume);
          setResume(parsedResume);

          // Clear draft localStorage when loading from upload to avoid conflicts
          localStorage.removeItem("resume-draft");

          // Remove the upload data after reading it
          removeLocalStorage("resume_upload");
        } else {
          console.error("Invalid resume structure:", parsedResume);
          removeLocalStorage("resume_upload");
        }
      } catch (error) {
        console.error("Failed to parse uploaded resume data:", error);
        console.error(
          "Raw localStorage data:",
          uploadedResumeData?.substring(0, 200),
        );
        // Clean up the invalid data
        removeLocalStorage("resume_upload");
      }
    } else {
      // Only load from localStorage draft if there's no upload data
      try {
        const saved = localStorage.getItem("resume-draft");
        if (saved) {
          console.log("Loading resume from localStorage draft");
          setResume(JSON.parse(saved));
        }
      } catch (e) {
        console.error("Failed to load saved resume:", e);
      }
    }
  }, []);

  // Detect viewport size for proper layout rendering
  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const currentStepData = STEPS[currentStep];

  // Autosave with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem("resume-draft", JSON.stringify(resume));
      } catch (e) {
        console.error("Failed to save resume:", e);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [resume]);

  // Calculate zoom transform based on actual fragment positions and sizes
  useEffect(() => {
    const calculateZoom = () => {
      const fragment = currentStepData.fragment;

      // Determine the specific DOM key to look for
      let lookupKey: any = fragment;
      if (
        fragment === "experience-header" ||
        fragment === "experience-bullets"
      ) {
        lookupKey = `${fragment}-${currentExpIndex}`;
      } else if (fragment === "education") {
        lookupKey = `${fragment}-${currentEduIndex}`;
      }

      const fragmentEl = fragmentRefs.current[lookupKey as any];
      const resumeEl = resumeContainerRef.current;
      const previewEl = previewContainerRef.current;

      // Default fallback
      const fallbackScale = isDesktop ? 1.1 : 0.35;

      if (!fragmentEl || !resumeEl || !previewEl) {
        setZoomTransform({ y: 0, scale: fallbackScale, yPixels: 0 });
        return;
      }

      // Check if elements are visible (have dimensions)
      const resumeRect = resumeEl.getBoundingClientRect();
      const previewRect = previewEl.getBoundingClientRect();

      if (resumeRect.width === 0 || resumeRect.height === 0) {
        setZoomTransform({ y: 0, scale: fallbackScale, yPixels: 0 });
        return;
      }

      // Calculate fragment position relative to resume container using offsetTop
      // This avoids issues with current transforms/transitions affecting getBoundingClientRect
      let fragmentTop = 0;
      let currentEl: HTMLElement | null = fragmentEl;

      // Traverse up to find offset relative to resume container
      while (currentEl && currentEl !== resumeEl) {
        fragmentTop += currentEl.offsetTop;
        currentEl = currentEl.offsetParent as HTMLElement;
      }

      // Get unscaled dimensions from layout
      const resumeHeight = resumeEl.offsetHeight;
      const fragmentHeight = fragmentEl.offsetHeight;
      const fragmentWidth = fragmentEl.offsetWidth;

      // Calculate scale to fit fragment in viewport (with padding)
      const availableWidth = previewRect.width * VIEWPORT_PADDING;
      const availableHeight = previewRect.height * VIEWPORT_PADDING;

      const scaleByWidth = availableWidth / fragmentWidth;
      const scaleByHeight = availableHeight / fragmentHeight;

      // Use the smaller scale to ensure fragment fits both dimensions
      let idealScale = Math.min(scaleByWidth, scaleByHeight);

      // Apply maximum limits
      const maxScale = isDesktop ? 1.1 : MAX_MOBILE_SCALE;
      idealScale = Math.min(idealScale, maxScale);

      // Ensure minimum reasonable scale
      const minScale = isDesktop ? 0.4 : 0.3;
      idealScale = Math.max(idealScale, minScale);

      // Calculate translation in pixels
      // "move top center of the fragment to center of viewport"
      const resumeCenter = resumeHeight / 2;

      // Calculate where the fragment top is relative to the resume center (unscaled)
      const fragmentTopFromCenter = fragmentTop - resumeCenter;

      // Scale that distance to find the visual offset
      const scaledFragmentTopFromCenter = fragmentTopFromCenter * idealScale;

      // We want the visual Top of the fragment to be at the Center of the Viewport
      // Resume Visual Center is at Viewport Center + yPixels
      // Fragment Visual Top is at Resume Visual Center + scaledFragmentTopFromCenter
      // So Fragment Visual Top = Viewport Center + yPixels + scaledFragmentTopFromCenter
      // We want Fragment Visual Top = Viewport Center
      // 0 = yPixels + scaledFragmentTopFromCenter
      // yPixels = -scaledFragmentTopFromCenter

      const yPixels = -scaledFragmentTopFromCenter;

      setZoomTransform({ y: 0, scale: idealScale, yPixels });
    };

    calculateZoom();
    window.addEventListener("resize", calculateZoom);
    return () => window.removeEventListener("resize", calculateZoom);
  }, [
    currentStepData.fragment,
    currentExpIndex,
    currentEduIndex,
    isDesktop,
    resume.experience, // Recalculate if content changes
    resume.education,
    resume, // Recalculate if any content changes size
  ]);

  // Normalized completion flags so progress and section badges stay in sync
  const stepCompletion = useMemo(() => {
    const nameComplete =
      hasText(resume.personal.firstName) && hasText(resume.personal.lastName);
    const contactComplete = hasText(resume.personal.email);
    const summaryComplete = hasText(resume.personal.summary);

    const experienceHeaderComplete = resume.experience.some((exp) =>
      isExperienceHeaderComplete(exp),
    );
    const experienceBulletsComplete = resume.experience.some((exp) =>
      isExperienceEntryComplete(exp),
    );

    const educationComplete = resume.education.some((edu) =>
      isEducationComplete(edu),
    );

    const skillsComplete =
      hasItems(resume.skills.technical) || hasItems(resume.skills.languages);

    return {
      name: nameComplete,
      contact: contactComplete,
      summary: summaryComplete,
      experience: experienceHeaderComplete,
      "experience-bullets": experienceBulletsComplete,
      education: educationComplete,
      skills: skillsComplete,
    };
  }, [resume]);

  // Auto-Scaling State
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(
    DENSITY_PRESETS[0],
  );
  const [isAutoScaling, setIsAutoScaling] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewScale, setPreviewScale] = useState(0.7); // Default scale for preview mode
  // Track the minimum valid preset index (all presets from this index onward are valid)
  // This only gets updated when auto-scaling finds the first fitting preset
  const [minValidPresetIndex, setMinValidPresetIndex] = useState(0);
  // Track if we're currently in the middle of an auto-scaling search
  const [isAutoScalingSettled, setIsAutoScalingSettled] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Calculate preview scale when entering preview mode or when container resizes
  useEffect(() => {
    if (!isPreviewMode) return;

    const calculatePreviewScale = () => {
      const container = previewContainerRef.current;
      if (!container) return;

      // A4 height is 297mm = ~1123px at 96dpi
      const a4Height = 1123;
      const containerHeight = container.offsetHeight;
      // Leave some padding (32px top/bottom)
      const availableHeight = containerHeight - 64;
      const scale = Math.min(availableHeight / a4Height, 1);
      setPreviewScale(scale);
    };

    // Calculate after a short delay to allow layout to settle
    const timeoutId = setTimeout(calculatePreviewScale, 50);

    // Also recalculate on resize
    const resizeObserver = new ResizeObserver(calculatePreviewScale);
    if (previewContainerRef.current) {
      resizeObserver.observe(previewContainerRef.current);
    }

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [isPreviewMode]);

  // Auto-Scaling Logic
  useEffect(() => {
    const checkOverflow = () => {
      const container = resumeContainerRef.current;
      const content = contentRef.current;
      if (!container || !content) return;

      // Get page height in pixels (297mm approx 1122px at 96dpi, but we rely on offsetHeight)
      const pageHeight = container.offsetHeight;
      // contentRef already includes padding in its offsetHeight since padding is applied to it
      const contentHeight = content.offsetHeight;

      // Check if content exceeds page height
      // We add a small buffer (2px) to avoid precision jitter
      const isOverflowing = contentHeight > pageHeight - 2;

      const currentIndex = DENSITY_PRESETS.findIndex(
        (p) => p.id === layoutConfig.id,
      );

      if (isOverflowing) {
        // Mark as not settled while still searching
        setIsAutoScalingSettled(false);

        // Auto-scale only if enabled
        if (isAutoScaling && currentIndex < DENSITY_PRESETS.length - 1) {
          console.log(
            `Overflow detected (${contentHeight}px > ${pageHeight}px). Switching to ${DENSITY_PRESETS[currentIndex + 1].id}`,
          );
          setLayoutConfig(DENSITY_PRESETS[currentIndex + 1]);
        }
      } else {
        // Current preset fits!
        // Only update minValidPresetIndex in these cases:
        // 1. Auto-scaling AND we started from Standard (index 0) - this is a fresh search
        // 2. Manual mode AND this preset is less dense than current minimum
        const shouldUpdateMin =
          (isAutoScaling && !isAutoScalingSettled) || // Auto-scaling search in progress
          (!isAutoScaling && currentIndex < minValidPresetIndex); // Manual found better option

        if (shouldUpdateMin) {
          setMinValidPresetIndex(currentIndex);
        }
        setIsAutoScalingSettled(true);
      }
    };

    // Use ResizeObserver to detect content size changes
    const resizeObserver = new ResizeObserver(() => {
      // Defer check to next frame to avoid loop limits
      requestAnimationFrame(checkOverflow);
    });

    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [layoutConfig, isAutoScaling, minValidPresetIndex]);

  // Helper to check if a preset is valid (fits within page)
  const isPresetValid = useCallback(
    (presetId: string) => {
      const presetIndex = DENSITY_PRESETS.findIndex((p) => p.id === presetId);
      return presetIndex >= minValidPresetIndex;
    },
    [minValidPresetIndex],
  );

  // When Auto mode is enabled, reset to Standard to find the optimal preset
  useEffect(() => {
    if (isAutoScaling && layoutConfig.id !== "standard") {
      // Reset to Standard and let the auto-scaling logic find the optimal preset
      setLayoutConfig(DENSITY_PRESETS[0]);
      setIsAutoScalingSettled(false);
    }
  }, [isAutoScaling]); // Only trigger when isAutoScaling changes

  // Reset to standard when content changes significantly, to allow re-optimization
  useEffect(() => {
    if (!isAutoScaling) return;

    // Only reset if we are not already standard AND content structure changed
    if (layoutConfig.id !== "standard") {
      // We reset to standard and let the overflow checker scale it down again if needed.
      // This prevents getting stuck in "dense" mode if user deletes text.
      setLayoutConfig(DENSITY_PRESETS[0]);
      // Also reset the minValidPresetIndex to allow rediscovery
      setMinValidPresetIndex(0);
      setIsAutoScalingSettled(false);
    }
  }, [
    resume.experience.length,
    resume.education.length,
    resume.skills.technical?.length,
    resume.skills.languages?.length,
  ]);

  const sectionDataFlags = useMemo<Record<SectionName, boolean>>(
    () => ({
      personal:
        hasText(resume.personal.firstName) || hasText(resume.personal.lastName),
      summary: hasText(resume.personal.summary),
      experience:
        resume.experience.length > 0 && hasExperienceData(resume.experience[0]),
      education:
        resume.education.length > 0 &&
        (hasText(resume.education[0].institution) ||
          hasText(resume.education[0].degree)),
      skills:
        (resume.skills.languages?.length ?? 0) > 0 ||
        (resume.skills.technical?.length ?? 0) > 0,
    }),
    [resume],
  );

  // Memoized calculations
  const progress = useMemo(() => {
    const completed = STEPS.filter(
      (step) =>
        stepCompletion[step.key as keyof typeof stepCompletion] ?? false,
    ).length;
    return Math.round((completed / STEPS.length) * 100);
  }, [stepCompletion]);

  const getSectionStatus = useCallback(
    (section: SectionName): SectionStatus => {
      const sectionSteps = STEPS.filter((s) => s.section === section);
      const completed = sectionSteps.every(
        (step) =>
          stepCompletion[step.key as keyof typeof stepCompletion] ?? false,
      );

      const hasAnyData = sectionDataFlags[section];

      return completed ? "complete" : hasAnyData ? "in-progress" : "incomplete";
    },
    [sectionDataFlags, stepCompletion],
  );

  const sectionStatuses = useMemo(
    () => ({
      personal: getSectionStatus("personal"),
      summary: getSectionStatus("summary"),
      experience: getSectionStatus("experience"),
      education: getSectionStatus("education"),
      skills: getSectionStatus("skills"),
    }),
    [getSectionStatus],
  );

  // Handlers
  const handleNext = useCallback(() => {
    const currentStepData = STEPS[currentStep];

    // Handle multi-step sections (experience, education)
    if (currentStepData.multi) {
      if (currentStepData.section === "experience") {
        if (currentStepData.fragment === "experience-header") {
          // Always move to bullets for the current experience
          const bulletsStepIndex = STEPS.findIndex(
            (s) => s.fragment === "experience-bullets",
          );
          if (bulletsStepIndex !== -1) {
            setCurrentStep(bulletsStepIndex);
          }
          return;
        } else if (currentStepData.fragment === "experience-bullets") {
          // If not on last experience, move to next experience header
          if (currentExpIndex < resume.experience.length - 1) {
            setCurrentExpIndex(currentExpIndex + 1);
            const headerStepIndex = STEPS.findIndex(
              (s) => s.fragment === "experience-header",
            );
            if (headerStepIndex !== -1) {
              setCurrentStep(headerStepIndex);
            }
            return;
          }
          // If on last experience bullets, move to next section
          // Reset to first experience for when user comes back
          setCurrentExpIndex(0);
          if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
          }
          return;
        }
      } else if (currentStepData.section === "education") {
        // If not on last education, move to next education
        if (currentEduIndex < resume.education.length - 1) {
          setCurrentEduIndex(currentEduIndex + 1);
          return;
        }
        // If on last education, move to next section
        setCurrentEduIndex(0);
        if (currentStep < STEPS.length - 1) {
          setCurrentStep(currentStep + 1);
        }
        return;
      }
    }

    // Default: move to next step
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsPreviewMode(true);
    }
  }, [
    currentStep,
    currentExpIndex,
    currentEduIndex,
    resume.experience.length,
    resume.education.length,
  ]);

  const handlePrevious = useCallback(() => {
    const currentStepData = STEPS[currentStep];

    // Handle multi-step sections (experience, education)
    if (currentStepData.multi) {
      if (currentStepData.section === "experience") {
        if (currentStepData.fragment === "experience-header") {
          // If on first experience header, move to previous section
          if (currentExpIndex === 0) {
            if (currentStep > 0) {
              setCurrentStep(currentStep - 1);
            }
            return;
          }
          // If not on first experience, move to previous experience's bullets
          setCurrentExpIndex(currentExpIndex - 1);
          const bulletsStepIndex = STEPS.findIndex(
            (s) => s.fragment === "experience-bullets",
          );
          if (bulletsStepIndex !== -1) {
            setCurrentStep(bulletsStepIndex);
          }
          return;
        } else if (currentStepData.fragment === "experience-bullets") {
          // Always move back to header for the same experience
          const headerStepIndex = STEPS.findIndex(
            (s) => s.fragment === "experience-header",
          );
          if (headerStepIndex !== -1) {
            setCurrentStep(headerStepIndex);
          }
          return;
        }
      } else if (currentStepData.section === "education") {
        // If not on first education, move to previous education
        if (currentEduIndex > 0) {
          setCurrentEduIndex(currentEduIndex - 1);
          return;
        }
        // If on first education, move to previous section
        setCurrentEduIndex(0);
        if (currentStep > 0) {
          setCurrentStep(currentStep - 1);
        }
        return;
      }
    }

    // Default: move to previous step
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep, currentExpIndex, currentEduIndex]);

  const jumpToSection = useCallback(
    (fragment: FragmentName, index?: number) => {
      const stepIndex = STEPS.findIndex((s) => s.fragment === fragment);
      if (stepIndex !== -1) {
        setCurrentStep(stepIndex);
        if (typeof index === "number") {
          // Determine if it's experience or education based on the fragment
          if (fragment.startsWith("experience")) {
            setCurrentExpIndex(index);
          } else if (fragment === "education") {
            setCurrentEduIndex(index);
          }
        }
      }
    },
    [],
  );

  const handleReset = useCallback(() => {
    setResume(INITIAL_RESUME);
    setCurrentStep(0);
    setCurrentExpIndex(0);
    setCurrentEduIndex(0);
    setTempBullet("");
    setTempTechnicalSkill("");
    setTempLanguage("");
    localStorage.removeItem("resume-draft");
  }, []);

  const updatePersonal = useCallback(
    <K extends keyof MetaResume["personal"]>(
      field: K,
      value: MetaResume["personal"][K],
    ) => {
      setResume((prev) => ({
        ...prev,
        personal: { ...prev.personal, [field]: value },
      }));
    },
    [],
  );

  const addExperienceBullet = useCallback(() => {
    if (!tempBullet.trim()) return;
    setResume((prev) => {
      const exp = [...prev.experience];
      exp[currentExpIndex] = {
        ...exp[currentExpIndex],
        description: [...exp[currentExpIndex].description, tempBullet],
      };
      return { ...prev, experience: exp };
    });
    setTempBullet("");
  }, [tempBullet, currentExpIndex]);

  const removeExperienceBullet = useCallback(
    (index: number) => {
      setResume((prev) => {
        const exp = [...prev.experience];
        exp[currentExpIndex] = {
          ...exp[currentExpIndex],
          description: exp[currentExpIndex].description.filter(
            (_, i) => i !== index,
          ),
        };
        return { ...prev, experience: exp };
      });
    },
    [currentExpIndex],
  );

  const updateExperience = useCallback(
    (field: string, value: string | boolean) => {
      setResume((prev) => {
        const exp = [...prev.experience];
        exp[currentExpIndex] = { ...exp[currentExpIndex], [field]: value };
        return { ...prev, experience: exp };
      });
    },
    [currentExpIndex],
  );

  const addExperience = useCallback(() => {
    setResume((prev) => ({
      ...prev,
      experience: [
        ...prev.experience,
        {
          id: Date.now().toString(),
          company: "",
          position: "",
          location: "",
          startDate: "",
          endDate: "",
          current: false,
          description: [],
        },
      ],
    }));
    setCurrentExpIndex((prev) => prev + 1);
  }, []);

  const updateEducation = useCallback(
    (field: string, value: string) => {
      setResume((prev) => {
        const edu = [...prev.education];
        edu[currentEduIndex] = { ...edu[currentEduIndex], [field]: value };
        return { ...prev, education: edu };
      });
    },
    [currentEduIndex],
  );

  const addEducation = useCallback(() => {
    setResume((prev) => ({
      ...prev,
      education: [
        ...prev.education,
        {
          id: Date.now().toString(),
          institution: "",
          degree: "",
          field: "",
          startDate: "",
          endDate: "",
        },
      ],
    }));
    setCurrentEduIndex((prev) => prev + 1);
  }, []);

  const addSkill = useCallback(
    (type: "technical" | "languages") => {
      const value = type === "technical" ? tempTechnicalSkill : tempLanguage;
      if (!value.trim()) return;

      setResume((prev) => ({
        ...prev,
        skills: {
          ...prev.skills,
          [type]: [...(prev.skills[type] || []), value],
        },
      }));

      if (type === "technical") {
        setTempTechnicalSkill("");
      } else {
        setTempLanguage("");
      }
    },
    [tempTechnicalSkill, tempLanguage],
  );

  const removeSkill = useCallback(
    (type: "technical" | "languages", index: number) => {
      setResume((prev) => ({
        ...prev,
        skills: {
          ...prev.skills,
          [type]: prev.skills[type]?.filter((_, i) => i !== index) || [],
        },
      }));
    },
    [],
  );

  // Callback refs for fragments
  const setFragmentRef = useCallback(
    (key: string) => (el: HTMLDivElement | null) => {
      fragmentRefs.current[key] = el;
    },
    [],
  );

  // Date Picker Component using Popover
  const DatePicker = ({
    id,
    label,
    value,
    onChange,
    required,
    disabled,
  }: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    required?: boolean;
    disabled?: boolean;
  }) => {
    const [open, setOpen] = useState(false);
    const selectedDate = parseDateValue(value);

    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>
          {label}
          {required ? " *" : ""}
        </Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={id}
              type="button"
              variant="outline"
              className="w-full justify-start text-left font-normal"
              disabled={disabled}
            >
              <CalendarIcon className="mr-2 h-4 w-4 opacity-60" />
              <span className={!value ? "text-muted-foreground" : ""}>
                {formatDateValue(value)}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (!date) return;
                const utcDate = new Date(
                  Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
                );
                const iso = utcDate.toISOString().split("T")[0];
                onChange(iso);
                setOpen(false);
              }}
              autoFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  };

  // Render input fields based on current step
  const renderInputs = () => {
    const step = currentStepData;

    if (step.section === "personal" && step.fragment === "name") {
      return (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              value={resume.personal.firstName}
              onChange={(e) => updatePersonal("firstName", e.target.value)}
              placeholder="Enter your first name"
              className="placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              value={resume.personal.lastName}
              onChange={(e) => updatePersonal("lastName", e.target.value)}
              placeholder="Enter your last name"
              className="placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="headline">Headline / Job Title</Label>
            <Input
              id="headline"
              value={resume.personal.headline || ""}
              onChange={(e) => updatePersonal("headline", e.target.value)}
              placeholder="e.g. Product Designer, Senior Frontend Engineer"
              className="placeholder:text-muted-foreground"
            />
          </div>
        </div>
      );
    }

    if (step.section === "personal" && step.fragment === "contact") {
      return (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={resume.personal.email}
              onChange={(e) => updatePersonal("email", e.target.value)}
              placeholder="you@example.com"
              className="placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={resume.personal.phone || ""}
              onChange={(e) => updatePersonal("phone", e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="placeholder:text-muted-foreground"
            />
          </div>
          <Separator />
          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={resume.personal.location || ""}
              onChange={(e) => updatePersonal("location", e.target.value)}
              placeholder="City, State or Country"
              className="placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="linkedin">LinkedIn</Label>
            <Input
              id="linkedin"
              value={resume.personal.linkedin || ""}
              onChange={(e) => updatePersonal("linkedin", e.target.value)}
              placeholder="linkedin.com/in/your-profile"
              className="placeholder:text-muted-foreground"
            />
          </div>
        </div>
      );
    }

    if (step.section === "summary") {
      return (
        <div className="space-y-1.5">
          <Label htmlFor="summary">Professional Summary</Label>
          <Textarea
            id="summary"
            value={resume.personal.summary || ""}
            onChange={(e) => updatePersonal("summary", e.target.value)}
            placeholder="Write 2-3 sentences about your professional background, key skills, and what you're looking for..."
            rows={4}
            className="placeholder:text-muted-foreground"
          />
        </div>
      );
    }

    if (
      step.section === "experience" &&
      step.fragment === "experience-header"
    ) {
      const exp = resume.experience[currentExpIndex];
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">
              Experience {currentExpIndex + 1} of {resume.experience.length}
            </Label>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label htmlFor="company">Company *</Label>
            <Input
              id="company"
              value={exp.company}
              onChange={(e) => updateExperience("company", e.target.value)}
              placeholder="Company or organization name"
              className="placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="position">Position *</Label>
            <Input
              id="position"
              value={exp.position}
              onChange={(e) => updateExperience("position", e.target.value)}
              placeholder="Your job title or role"
              className="placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp-location">Location</Label>
            <Input
              id="exp-location"
              value={exp.location || ""}
              onChange={(e) => updateExperience("location", e.target.value)}
              placeholder="City, State or Remote"
              className="placeholder:text-muted-foreground"
            />
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              id="startDate"
              label="Start Date"
              value={exp.startDate}
              onChange={(val) => updateExperience("startDate", val)}
              required
            />
            <DatePicker
              id="endDate"
              label="End Date"
              value={exp.endDate || ""}
              onChange={(val) => updateExperience("endDate", val)}
              disabled={exp.current}
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="current"
              checked={exp.current}
              onCheckedChange={(checked) =>
                updateExperience("current", checked)
              }
            />
            <Label htmlFor="current" className="cursor-pointer font-normal">
              I currently work here
            </Label>
          </div>

          <Separator />

          {currentExpIndex === resume.experience.length - 1 && (
            <Button
              onClick={addExperience}
              variant="outline"
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Experience
            </Button>
          )}
        </div>
      );
    }

    if (
      step.section === "experience" &&
      step.fragment === "experience-bullets"
    ) {
      const exp = resume.experience[currentExpIndex];
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-base font-medium">
              Experience {currentExpIndex + 1} of {resume.experience.length}
            </Label>
          </div>
          <Separator />
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label htmlFor="bullet">Responsibilities & Achievements</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p>
                    Add bullet points describing your key responsibilities and
                    accomplishments. Use action verbs and quantify results when
                    possible.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex gap-2">
              <Input
                id="bullet"
                value={tempBullet}
                onChange={(e) => setTempBullet(e.target.value)}
                placeholder="Describe an achievement or responsibility, then press Enter"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addExperienceBullet();
                  }
                }}
                className="placeholder:text-muted-foreground"
              />
              <Button onClick={addExperienceBullet} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {exp.description.length > 0 && <Separator />}

          <div className="space-y-2 max-h-32 overflow-y-auto">
            {exp.description.map((bullet, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 border"
              >
                <span className="text-sm flex-1 leading-relaxed">{bullet}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => removeExperienceBullet(idx)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (step.section === "education") {
      const edu = resume.education[currentEduIndex];
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">
              Education {currentEduIndex + 1} of {resume.education.length}
            </Label>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label htmlFor="institution">Institution *</Label>
            <Input
              id="institution"
              value={edu.institution}
              onChange={(e) => updateEducation("institution", e.target.value)}
              placeholder="University or school name"
              className="placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="degree">Degree *</Label>
            <Input
              id="degree"
              value={edu.degree}
              onChange={(e) => updateEducation("degree", e.target.value)}
              placeholder="e.g. Bachelor of Science, MBA, High School Diploma"
              className="placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="field">Field of Study *</Label>
            <Input
              id="field"
              value={edu.field}
              onChange={(e) => updateEducation("field", e.target.value)}
              placeholder="e.g. Computer Science, Business, Engineering"
              className="placeholder:text-muted-foreground"
            />
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              id="edu-startDate"
              label="Start Date"
              value={edu.startDate || ""}
              onChange={(val) => updateEducation("startDate", val)}
            />
            <DatePicker
              id="edu-endDate"
              label="End Date"
              value={edu.endDate || ""}
              onChange={(val) => updateEducation("endDate", val)}
            />
          </div>

          <Separator />

          {currentEduIndex === resume.education.length - 1 && (
            <Button onClick={addEducation} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Another Education
            </Button>
          )}
        </div>
      );
    }

    if (step.section === "skills") {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="technical">Technical Skills</Label>
            <div className="flex gap-2">
              <Input
                id="technical"
                value={tempTechnicalSkill}
                onChange={(e) => setTempTechnicalSkill(e.target.value)}
                placeholder="Add a skill and press Enter"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill("technical");
                  }
                }}
                className="placeholder:text-muted-foreground"
              />
              <Button onClick={() => addSkill("technical")} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {resume.skills.technical?.map((skill, idx) => (
                <Badge key={idx} variant="secondary" className="gap-1 pr-1">
                  {skill}
                  <button
                    onClick={() => removeSkill("technical", idx)}
                    className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="languages">Languages</Label>
            <div className="flex gap-2">
              <Input
                id="languages"
                value={tempLanguage}
                onChange={(e) => setTempLanguage(e.target.value)}
                placeholder="Add a language and press Enter"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill("languages");
                  }
                }}
                className="placeholder:text-muted-foreground"
              />
              <Button onClick={() => addSkill("languages")} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {resume.skills.languages?.map((lang, idx) => (
                <Badge key={idx} variant="secondary" className="gap-1 pr-1">
                  {lang}
                  <button
                    onClick={() => removeSkill("languages", idx)}
                    className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const getFragmentOpacity = (fragment: FragmentName) => {
    const fragmentOrder: FragmentName[] = [
      "name",
      "contact",
      "summary",
      "experience-header",
      "experience-bullets",
      "education",
      "skills",
    ];
    const currentIndex = fragmentOrder.indexOf(currentStepData.fragment);
    const fragmentIndex = fragmentOrder.indexOf(fragment);

    if (fragmentIndex === currentIndex) return "opacity-100";
    if (fragmentIndex < currentIndex) return "opacity-70";
    return "opacity-40";
  };

  // A4 Resume Component with zoom capability
  const renderResume = () => {
    // In Preview Mode, no fragment is active (no zoom/highlight)
    const isFragmentActive = (fragment: FragmentName) =>
      !isPreviewMode && currentStepData.fragment === fragment;

    // Disable click handlers in Preview Mode
    const handleFragmentClick = (fn: () => void) => {
      if (!isPreviewMode) fn();
    };

    // Helper to determine if content is placeholder
    const hasFirst = hasText(resume.personal.firstName);
    const hasLast = hasText(resume.personal.lastName);
    const headline =
      resume.personal.headline?.trim() || resume.experience[0]?.position || "";
    const hasHeadline = Boolean(headline);
    const hasSummary = !!resume.personal.summary;
    const contactSegments = [
      {
        value: resume.personal.location?.trim(),
        placeholder: "Location",
      },
      {
        value: resume.personal.email?.trim(),
        placeholder: "Email",
      },
      {
        value: resume.personal.phone?.trim(),
        placeholder: "Phone",
      },
      {
        value: resume.personal.linkedin?.trim(),
        placeholder: "LinkedIn",
      },
    ].filter((segment) => segment.value || segment.placeholder);

    return (
      <div
        ref={resumeContainerRef}
        className="bg-card text-card-foreground shadow-2xl relative"
        style={{
          // A4 dimensions: 210mm × 297mm
          width: "210mm",
          height: "297mm",
          minWidth: "210mm",
          minHeight: "297mm",
        }}
      >
        <div
          ref={contentRef}
          className="w-full"
          style={{
            padding: `${layoutConfig.padding}mm`,
            lineHeight: layoutConfig.lineHeight,
            fontSize: `${layoutConfig.fontSize}pt`,
          }}
        >
          {/* Header - Left Aligned Name */}
          <motion.div
            ref={setFragmentRef("name")}
            onClick={() => handleFragmentClick(() => jumpToSection("name"))}
            animate={{
              scale: isFragmentActive("name") ? 1.02 : 1,
            }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            style={{ marginBottom: layoutConfig.sectionMargin / 3 + "px" }}
            className={`transition-all duration-300 rounded-lg -mx-2 px-2 ${!isPreviewMode ? "cursor-pointer hover:bg-primary/5" : ""} ${getFragmentOpacity("name")} ${isFragmentActive("name")
              ? "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-sm"
              : ""
              }`}
          >
            <h1
              className="font-bold tracking-wide uppercase leading-tight"
              style={{ fontSize: `${layoutConfig.headerSize}pt` }}
            >
              <span
                className={
                  hasFirst
                    ? "text-foreground"
                    : "text-muted-foreground/50 inline-block"
                }
              >
                {resume.personal.firstName || "First"}
              </span>{" "}
              <span
                className={
                  hasLast
                    ? "text-foreground"
                    : "text-muted-foreground/50 inline-block"
                }
              >
                {resume.personal.lastName || "Last"}
              </span>
            </h1>
            <h2
              className={`font-semibold tracking-widest uppercase mt-1 ${hasHeadline ? "text-foreground" : "text-muted-foreground/50"}`}
              style={{ fontSize: `${layoutConfig.roleSize}pt` }}
            >
              {headline || "Job Title"}
            </h2>
          </motion.div>

          {/* Contact Info */}
          <motion.div
            ref={setFragmentRef("contact")}
            onClick={() => handleFragmentClick(() => jumpToSection("contact"))}
            animate={{
              scale: isFragmentActive("contact") ? 1.02 : 1,
            }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            style={{
              marginBottom: layoutConfig.sectionMargin + "px",
              fontSize: `${layoutConfig.fontSize}pt`,
            }}
            className={`transition-all duration-300 rounded-lg py-1 -mx-2 px-2 ${!isPreviewMode ? "cursor-pointer hover:bg-primary/5" : ""} ${getFragmentOpacity("contact")} ${isFragmentActive("contact")
              ? "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-sm"
              : ""
              }`}
          >
            <p className="flex flex-wrap items-center leading-relaxed">
              {contactSegments.map((segment, idx) => {
                const filled = hasText(segment.value);
                return (
                  <span key={idx} className="flex items-center">
                    {idx > 0 && <span className="mx-2 text-foreground">|</span>}
                    <span
                      className={
                        filled
                          ? "text-foreground"
                          : "text-muted-foreground/50 italic"
                      }
                    >
                      {segment.value || segment.placeholder}
                    </span>
                  </span>
                );
              })}
            </p>
          </motion.div>

          <div
            className="border-b-2 border-black"
            style={{ marginBottom: layoutConfig.sectionMargin + "px" }}
          />

          {/* Summary */}
          <motion.div
            ref={setFragmentRef("summary")}
            onClick={() => handleFragmentClick(() => jumpToSection("summary"))}
            animate={{
              scale: isFragmentActive("summary") ? 1.02 : 1,
            }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            style={{ marginBottom: layoutConfig.sectionMargin + "px" }}
            className={`transition-all duration-300 rounded-lg p-2 -mx-2 ${!isPreviewMode ? "cursor-pointer hover:bg-primary/5" : ""} ${getFragmentOpacity("summary")} ${isFragmentActive("summary")
              ? "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-sm"
              : ""
              }`}
          >
            <h3
              className="font-bold tracking-wider text-foreground uppercase border-b border-black pb-1"
              style={{
                fontSize: `${layoutConfig.sectionHeaderSize}pt`,
                marginBottom: layoutConfig.itemMargin + "px",
              }}
            >
              SUMMARY
            </h3>
            {hasSummary ? (
              <p className="leading-relaxed text-foreground">
                {resume.personal.summary}
              </p>
            ) : (
              <p className="leading-relaxed text-muted-foreground/50 italic border-b border-dashed border-muted-foreground/20 pb-2">
                Your professional summary will appear here...
              </p>
            )}
          </motion.div>

          {/* Experience */}
          <div
            className={`transition-opacity duration-300 ${getFragmentOpacity("experience-header")}`}
            style={{ marginBottom: layoutConfig.sectionMargin + "px" }}
          >
            <h3
              className="font-bold tracking-wider text-foreground uppercase border-b border-black pb-1"
              style={{
                fontSize: `${layoutConfig.sectionHeaderSize}pt`,
                marginBottom: layoutConfig.itemMargin + "px",
              }}
            >
              PROFESSIONAL EXPERIENCE
            </h3>
            <div
              style={{
                gap: layoutConfig.itemMargin + "px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {resume.experience.map((exp, idx) => {
                const isCurrentExp = idx === currentExpIndex;
                const hasContent = hasExperienceData(exp);

                if (!hasContent && idx > 0) return null;

                return (
                  <div key={exp.id}>
                    <motion.div
                      ref={
                        isCurrentExp
                          ? setFragmentRef(`experience-header-${idx}`)
                          : undefined
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFragmentClick(() =>
                          jumpToSection("experience-header", idx),
                        );
                      }}
                      animate={{
                        scale:
                          isFragmentActive("experience-header") && isCurrentExp
                            ? 1.02
                            : 1,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 240,
                        damping: 24,
                      }}
                      className={`transition-all duration-300 rounded-lg p-2 -mx-2 ${!isPreviewMode ? "cursor-pointer hover:bg-primary/5" : ""} ${isFragmentActive("experience-header") && isCurrentExp
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-sm"
                        : ""
                        } ${isCurrentExp ? "opacity-100" : "opacity-70"}`}
                    >
                      <div className="flex justify-between items-baseline mb-1">
                        <p className="font-bold">
                          <span
                            className={
                              hasText(exp.position)
                                ? "text-foreground"
                                : "text-muted-foreground/50"
                            }
                          >
                            {exp.position || "Position"}
                          </span>
                          <span className="text-muted-foreground/40">, </span>
                          <span
                            className={
                              hasText(exp.company)
                                ? "text-foreground"
                                : "text-muted-foreground/50"
                            }
                          >
                            {exp.company || "Company"}
                          </span>
                        </p>
                        <p className="font-bold whitespace-nowrap ml-4">
                          <span
                            className={
                              hasText(exp.startDate)
                                ? "text-foreground"
                                : "text-muted-foreground/50"
                            }
                          >
                            {hasText(exp.startDate)
                              ? formatDateValue(exp.startDate)
                              : "Start"}
                          </span>
                          <span className="mx-1 text-muted-foreground/50">
                            -
                          </span>
                          <span
                            className={
                              exp.current || hasText(exp.endDate)
                                ? "text-foreground"
                                : "text-muted-foreground/50"
                            }
                          >
                            {exp.current
                              ? "Present"
                              : hasText(exp.endDate)
                                ? formatDateValue(exp.endDate)
                                : "End"}
                          </span>
                        </p>
                      </div>
                      <p className="mb-1">
                        <span
                          className={
                            hasText(exp.location)
                              ? "text-foreground"
                              : "text-muted-foreground/50 italic"
                          }
                        >
                          {exp.location || "Location"}
                        </span>
                      </p>
                    </motion.div>

                    <motion.div
                      ref={
                        isCurrentExp
                          ? setFragmentRef(`experience-bullets-${idx}`)
                          : undefined
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFragmentClick(() =>
                          jumpToSection("experience-bullets", idx),
                        );
                      }}
                      animate={{
                        scale:
                          isFragmentActive("experience-bullets") && isCurrentExp
                            ? 1.02
                            : 1,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 240,
                        damping: 24,
                      }}
                      className={`mt-1 transition-all duration-300 rounded-lg p-2 -mx-2 ${!isPreviewMode ? "cursor-pointer hover:bg-primary/5" : ""} ${getFragmentOpacity("experience-bullets")} ${isFragmentActive("experience-bullets") && isCurrentExp
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-sm"
                        : ""
                        }`}
                    >
                      {exp.description.length > 0 ? (
                        <ul className="list-disc list-outside ml-4 space-y-1">
                          {exp.description.map((bullet, bulletIdx) => (
                            <li
                              key={bulletIdx}
                              className="leading-relaxed text-foreground"
                            >
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground/50 italic ml-4">
                          • Add your achievements and responsibilities...
                        </p>
                      )}
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Education */}
          <motion.div
            animate={{
              scale: isFragmentActive("education") ? 1.02 : 1,
            }}
            transition={{ type: "spring", stiffness: 240, damping: 24 }}
            style={{ marginBottom: layoutConfig.sectionMargin + "px" }}
            className={`transition-all duration-300 cursor-pointer hover:bg-primary/5 rounded-lg p-2 -mx-2 ${getFragmentOpacity("education")} ${isFragmentActive("education")
              ? "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-sm"
              : ""
              }`}
          >
            <h3
              className="font-bold tracking-wider text-foreground uppercase border-b border-black pb-1"
              style={{
                fontSize: `${layoutConfig.sectionHeaderSize}pt`,
                marginBottom: layoutConfig.itemMargin + "px",
              }}
            >
              EDUCATION
            </h3>
            <div
              style={{
                gap: layoutConfig.itemMargin + "px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {resume.education.map((edu, idx) => {
                const hasDegree = hasText(edu.degree);
                const hasField = hasText(edu.field);
                const hasInstitution = hasText(edu.institution);
                const hasContent = hasInstitution || hasDegree || hasField;
                if (!hasContent && idx > 0) return null;

                return (
                  <div
                    ref={
                      isFragmentActive("education") && currentEduIndex === idx
                        ? setFragmentRef(`education-${idx}`)
                        : undefined
                    }
                    key={edu.id}
                    className={`rounded-sm p-1 transition-colors ${!isPreviewMode ? "hover:bg-black/5 cursor-pointer" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFragmentClick(() =>
                        jumpToSection("education", idx),
                      );
                    }}
                  >
                    <div className="flex justify-between items-baseline mb-1">
                      <p className="font-bold">
                        <span
                          className={
                            hasDegree
                              ? "text-foreground"
                              : "text-muted-foreground/50"
                          }
                        >
                          {edu.degree || "Degree"}
                        </span>
                        <span className="text-muted-foreground/40"> in </span>
                        <span
                          className={
                            hasField
                              ? "text-foreground"
                              : "text-muted-foreground/50"
                          }
                        >
                          {edu.field || "Field"}
                        </span>
                      </p>
                      <p className="font-bold whitespace-nowrap ml-4">
                        <span
                          className={
                            hasText(edu.startDate)
                              ? "text-foreground"
                              : "text-muted-foreground/50"
                          }
                        >
                          {hasText(edu.startDate)
                            ? formatDateValue(edu.startDate)
                            : "Start"}
                        </span>
                        <span className="mx-1 text-muted-foreground/50">-</span>
                        <span
                          className={
                            hasText(edu.endDate)
                              ? "text-foreground"
                              : "text-muted-foreground/50"
                          }
                        >
                          {hasText(edu.endDate)
                            ? formatDateValue(edu.endDate)
                            : "End"}
                        </span>
                      </p>
                    </div>
                    <p>
                      <span
                        className={
                          hasInstitution
                            ? "text-foreground"
                            : "text-muted-foreground/50"
                        }
                      >
                        {edu.institution || "Institution"}
                      </span>
                    </p>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Skills */}
          <motion.div
            ref={setFragmentRef("skills")}
            onClick={() => handleFragmentClick(() => jumpToSection("skills"))}
            animate={{
              scale: isFragmentActive("skills") ? 1.02 : 1,
            }}
            transition={{ type: "spring", stiffness: 240, damping: 24 }}
            className={`grid grid-cols-3 gap-8 transition-all duration-300 rounded-lg p-2 -mx-2 ${!isPreviewMode ? "cursor-pointer hover:bg-primary/5" : ""} ${getFragmentOpacity("skills")} ${isFragmentActive("skills")
              ? "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-sm"
              : ""
              }`}
          >
            <div>
              <h3
                className="font-bold tracking-wider text-foreground uppercase border-b border-black pb-1"
                style={{
                  fontSize: `${layoutConfig.sectionHeaderSize}pt`,
                  marginBottom: layoutConfig.itemMargin + "px",
                }}
              >
                LANGUAGES
              </h3>
              <div className="space-y-1">
                {resume.skills.languages?.length ? (
                  <ul className="list-none space-y-1">
                    {resume.skills.languages.map((lang, idx) => (
                      <li key={idx} className="text-foreground">
                        {lang}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground/50 italic">
                    Add languages...
                  </p>
                )}
              </div>
            </div>

            <div className="col-span-2">
              <h3
                className="font-bold tracking-wider text-foreground uppercase border-b border-black pb-1"
                style={{
                  fontSize: `${layoutConfig.sectionHeaderSize}pt`,
                  marginBottom: layoutConfig.itemMargin + "px",
                }}
              >
                SKILLS
              </h3>
              {resume.skills.technical?.length ? (
                <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                  {resume.skills.technical.map((skill, idx) => (
                    <div key={idx} className="text-foreground">
                      {skill}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground/50 italic">Add skills...</p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen overflow-hidden bg-background">
      {/* Desktop Layout - Fixed 100vh */}
      {isDesktop && (
        <div className="flex flex-col h-screen">
          {/* Navbar - Only show in Edit Mode */}
          {!isPreviewMode && <Navbar />}

          {/* Reset Dialog (controlled, shared with mobile) */}
          <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset Resume</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all your resume data and reset to
                  the initial state. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleReset}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Reset Everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex flex-1 min-h-0 relative">
            {/* Left Sidebar - Hidden in Preview Mode */}
            {!isPreviewMode && (
              <aside className="w-72 shrink-0 bg-card border-r flex flex-col">
                <div className="p-6 border-b">
                  <h1 className="text-lg font-bold">Resume Builder</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Build your professional resume
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-1">
                    {(
                      [
                        "personal",
                        "summary",
                        "experience",
                        "education",
                        "skills",
                      ] as SectionName[]
                    ).map((section) => {
                      const status = sectionStatuses[section];
                      const sectionSteps = STEPS.filter(
                        (s) => s.section === section,
                      );
                      const isActive = sectionSteps.some(
                        (s) => s.key === currentStepData.key,
                      );

                      return (
                        <button
                          key={section}
                          onClick={() => {
                            const stepIndex = STEPS.findIndex(
                              (s) => s.section === section,
                            );
                            if (stepIndex !== -1) setCurrentStep(stepIndex);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left ${isActive
                            ? "bg-primary text-primary-foreground"
                            : status === "complete"
                              ? "bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20"
                              : "hover:bg-muted"
                            }`}
                        >
                          <span className="shrink-0">
                            {SECTION_ICONS[section]}
                          </span>
                          <span className="capitalize flex-1">{section}</span>
                          {status === "complete" && (
                            <Check className="h-4 w-4 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <Separator className="my-6" />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  <Separator className="my-6" />

                  <Button
                    variant="outline"
                    className="w-full"
                    size="sm"
                    onClick={() => setResetDialogOpen(true)}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset All
                  </Button>

                  <Button
                    variant="default"
                    className="w-full mt-2"
                    size="sm"
                    onClick={() => setIsPreviewMode(true)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                </div>

                <div className="p-4 border-t text-xs text-muted-foreground">
                  <p>Auto-saved</p>
                </div>
              </aside>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-muted/30 relative">
              {/* Preview Toolbar - Only in Preview Mode */}
              {isPreviewMode && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-background/80 backdrop-blur-md shadow-lg border rounded-full px-4 py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-full"
                    onClick={() => setIsPreviewMode(false)}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back to Editor
                  </Button>
                  <div className="h-4 w-px bg-border mx-1" />
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground font-medium">
                      Density:
                    </span>
                    <div className="flex bg-muted rounded-full p-1">
                      <button
                        onClick={() => setIsAutoScaling(true)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${isAutoScaling ? "bg-primary text-primary-foreground shadow-sm" : "hover:text-foreground text-muted-foreground"}`}
                      >
                        Auto
                      </button>
                      {DENSITY_PRESETS.map((preset) => {
                        const isValid = isPresetValid(preset.id);
                        const isSelected =
                          !isAutoScaling && layoutConfig.id === preset.id;
                        return (
                          <button
                            key={preset.id}
                            disabled={!isValid}
                            onClick={() => {
                              if (isValid) {
                                setIsAutoScaling(false);
                                setLayoutConfig(preset);
                              }
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${isSelected
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : isValid
                                ? "hover:text-foreground text-muted-foreground"
                                : "text-muted-foreground/40 cursor-not-allowed"
                              }`}
                          >
                            {preset.id.charAt(0).toUpperCase() +
                              preset.id.slice(1).replace("-", " ")}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Resume Preview with Zoom - Takes remaining height */}
              <div
                ref={previewContainerRef}
                className="flex-1 overflow-hidden relative"
              >
                <div className="absolute inset-0 flex items-center justify-center p-8">
                  <motion.div
                    animate={{
                      scale: isPreviewMode ? previewScale : zoomTransform.scale,
                      y: isPreviewMode ? 0 : zoomTransform.yPixels,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 120,
                      damping: 20,
                    }}
                    style={{
                      transformOrigin: "center center",
                    }}
                  >
                    {renderResume()}
                  </motion.div>
                </div>
              </div>

              {/* Form Area & Nav - Hidden in Preview Mode */}
              {!isPreviewMode && (
                <>
                  {/* Gradient Divider */}
                  <div className="h-4 bg-linear-to-b from-muted/30 to-background" />

                  {/* Form Area - Fixed at bottom */}
                  <div className="bg-background border-t shrink-0">
                    <div className="max-w-xl mx-auto px-6 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {SECTION_ICONS[currentStepData.section]}
                          <h2 className="text-base font-semibold capitalize">
                            {currentStepData.section}
                          </h2>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          Step {currentStep + 1} of {STEPS.length}
                        </span>
                      </div>

                      <Separator className="mb-3" />

                      <div className="max-h-[28vh] overflow-y-auto pr-2 mb-3 p-2">
                        {renderInputs()}
                      </div>

                      <Separator className="mb-3" />

                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={handlePrevious}
                          disabled={currentStep === 0}
                          className="flex-1"
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Previous
                        </Button>
                        <Button
                          onClick={handleNext}
                          disabled={false} // Always enabled to allow Finish
                          className="flex-1"
                        >
                          {currentStep === STEPS.length - 1
                            ? "Preview"
                            : "Next"}
                          {currentStep !== STEPS.length - 1 && (
                            <ChevronRight className="h-4 w-4 ml-1" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile/Tablet Layout */}
      {!isDesktop && (
        <div className="flex flex-col h-screen">
          {/* Navbar with integrated progress */}
          <Navbar
            progress={progress}
            onReset={() => setResetDialogOpen(true)}
            onPreview={() => setIsPreviewMode(true)}
          />

          {/* Reset Dialog (controlled) */}
          <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset Resume</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all your resume data and reset to
                  the initial state. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleReset}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Reset Everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Resume Preview with Zoom */}
          <div
            ref={previewContainerRef}
            className="flex-1 min-h-0 bg-muted/30 overflow-hidden relative"
          >
            {/* Preview Toolbar - Only in Preview Mode (Mobile) */}
            {isPreviewMode && (
              <div className="absolute top-0 left-0 right-0 z-50 w-full flex items-center justify-between gap-2 bg-background/90 backdrop-blur-md border-b px-4 py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => setIsPreviewMode(false)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <div className="flex items-center gap-1 bg-muted rounded-full p-1">
                  <button
                    onClick={() => setIsAutoScaling(true)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${isAutoScaling ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"}`}
                  >
                    Auto
                  </button>
                  {DENSITY_PRESETS.map((preset) => {
                    const isValid = isPresetValid(preset.id);
                    const isSelected =
                      !isAutoScaling && layoutConfig.id === preset.id;
                    return (
                      <button
                        key={preset.id}
                        disabled={!isValid}
                        onClick={() => {
                          if (isValid) {
                            setIsAutoScaling(false);
                            setLayoutConfig(preset);
                          }
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${isSelected
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : isValid
                            ? "text-muted-foreground"
                            : "text-muted-foreground/40"
                          }`}
                      >
                        {preset.id.charAt(0).toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="absolute inset-0 flex items-center justify-center p-4">
              <motion.div
                animate={{
                  scale: isPreviewMode
                    ? Math.min(
                      ((previewContainerRef.current?.offsetWidth || 400) /
                        794) *
                      0.95,
                      0.5,
                    )
                    : zoomTransform.scale,
                  y: isPreviewMode ? 0 : zoomTransform.yPixels,
                }}
                transition={{
                  type: "spring",
                  stiffness: 120,
                  damping: 20,
                }}
                style={{
                  transformOrigin: "center center",
                }}
              >
                {renderResume()}
              </motion.div>
            </div>
          </div>

          {/* Form Area - Hidden in Preview Mode */}
          {!isPreviewMode && (
            <>
              {/* Gradient Fade */}
              <div className="h-3 bg-linear-to-b from-muted/30 to-background shrink-0" />

              {/* Form Area */}
              <div className="bg-background border-t py-4 px-2 shrink-0">
                <div className="max-h-[35vh] overflow-y-auto mb-3 p-2">
                  {renderInputs()}
                </div>

                <Separator className="mb-3" />

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentStep === 0}
                    className="flex-1"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={false}
                    className="flex-1"
                  >
                    {currentStep === STEPS.length - 1 ? "Preview" : "Next"}
                    {currentStep !== STEPS.length - 1 && (
                      <ChevronRight className="h-4 w-4 ml-1" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
