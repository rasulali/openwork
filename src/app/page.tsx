"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Upload,
  FileText,
  ImageIcon,
  Check,
  Sparkles,
  Zap,
  Shield,
  Star,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { toast } from "sonner";

export default function HomePage() {
  const router = useRouter();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/png",
      "image/jpeg",
      "image/jpg",
    ];

    if (!validTypes.includes(file.type)) {
      toast("Please upload a PDF, DOCX, PNG, or JPEG file");
      return;
    }

    setSelectedFile(file);
    setIsUploading(true);
    setUploadStatus("Uploading image...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadStatus("Extracting text from image...");
      const response = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Upload failed");
      }

      const data = await response.json();
      console.log("OCR response:", data);

      if (!data.success || !data.data) {
        throw new Error("Invalid response from server");
      }

      // Validate the data structure
      if (
        !data.data.personal ||
        !data.data.experience ||
        !data.data.education ||
        !data.data.skills
      ) {
        console.error("Invalid resume structure:", data.data);
        throw new Error("Invalid resume structure received from server");
      }

      setUploadStatus("Parsing resume data...");

      // Save the MetaResume data to localStorage
      try {
        const resumeData = JSON.stringify(data.data);
        localStorage.setItem("resume_upload", resumeData);
        console.log("Resume data saved to localStorage successfully");
      } catch (error) {
        console.error("Failed to save resume data to localStorage:", error);
        if (
          error instanceof DOMException &&
          error.name === "QuotaExceededError"
        ) {
          throw new Error(
            "Storage quota exceeded. Please clear some data and try again.",
          );
        }
        throw new Error("Failed to save resume data. Please try again.");
      }

      setUploadStatus("Success! Redirecting to builder...");

      // Redirect to builder page
      setTimeout(() => {
        router.push("/builder");
      }, 500);
    } catch (error) {
      console.error("Upload error:", error);
      setIsUploading(false);
      setUploadStatus("");
      toast.error(
        error instanceof Error
          ? `Upload failed: ${error.message}`
          : "Upload failed. Please try again.",
      );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {/* Hero Section with File Upload */}
      <section className="relative overflow-hidden border-b border-border bg-linear-to-b from-muted/30 to-background px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left Column - Text */}
            <div className="flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary w-fit mb-6">
                <Sparkles className="h-4 w-4" />
                Free Forever
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl text-balance">
                Build your perfect resume in minutes
              </h1>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed text-pretty">
                Create ATS-optimized professional resumes with AI-powered tools.
                Upload your existing resume or start from scratch. Completely
                free with no hidden costs.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Button size="lg" className="text-base" asChild>
                  <Link href="/builder">Start Building</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="text-base bg-transparent"
                >
                  <Link href="#templates">View Templates</Link>
                </Button>
              </div>
              <div className="mt-8 flex items-center gap-6">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-10 w-10 rounded-full border-2 border-background bg-muted"
                    />
                  ))}
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">10,000+</span>{" "}
                  resumes created
                </div>
              </div>
            </div>

            {/* Right Column - Upload Area */}
            <div className="flex items-center justify-center">
              <Card className="w-full max-w-md shadow-lg">
                <CardContent className="p-6">
                  <h3 className="mb-4 text-xl font-semibold text-foreground">
                    Upload Your Resume
                  </h3>
                  <p className="mb-6 text-sm text-muted-foreground">
                    Have an existing resume? Upload it and we'll help you
                    improve it with AI.
                  </p>

                  <div
                    className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                      dragActive
                        ? "border-primary bg-primary/5"
                        : "border-border bg-muted/30"
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      id="file-upload"
                      className="sr-only"
                      accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.docx,image/png,image/jpeg,image/jpg"
                      onChange={handleChange}
                      disabled={isUploading}
                    />

                    {selectedFile ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="rounded-full bg-primary/10 p-3">
                          {isUploading ? (
                            <Loader2 className="h-6 w-6 text-primary animate-spin" />
                          ) : (
                            <Check className="h-6 w-6 text-primary" />
                          )}
                        </div>
                        <div className="text-sm font-medium text-foreground">
                          {selectedFile.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {uploadStatus ||
                            (isUploading
                              ? "Processing..."
                              : "Ready to process")}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                          <Upload className="h-6 w-6 text-primary" />
                        </div>
                        <div className="mb-2 text-sm font-medium text-foreground">
                          Drag and drop your resume here
                        </div>
                        <div className="mb-4 text-xs text-muted-foreground">
                          or click to browse
                        </div>
                        <label htmlFor="file-upload">
                          <Button
                            asChild
                            variant="outline"
                            disabled={isUploading}
                          >
                            <span className="cursor-pointer">
                              {isUploading ? "Uploading..." : "Choose File"}
                            </span>
                          </Button>
                        </label>
                      </>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      <span>PDF</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      <span>DOCX</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" />
                      <span>PNG</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" />
                      <span>JPG</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="border-b border-border px-4 py-16 sm:px-6 lg:px-8 lg:py-24"
      >
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-balance">
              Everything you need to land your dream job
            </h2>
            <p className="mt-4 text-lg text-muted-foreground text-pretty">
              Professional tools designed to give you an edge in the job market
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Sparkles,
                title: "AI-Powered Writing",
                description:
                  "Let AI help you write compelling resume content that highlights your achievements and skills.",
              },
              {
                icon: Zap,
                title: "ATS Optimization",
                description:
                  "Ensure your resume passes Applicant Tracking Systems with our built-in optimization.",
              },
              {
                icon: Shield,
                title: "Privacy First",
                description:
                  "Your data is secure. We never share your information with third parties.",
              },
              {
                icon: FileText,
                title: "Multiple Formats",
                description:
                  "Export your resume in PDF or DOCX format, ready to send to employers.",
              },
              {
                icon: Star,
                title: "Professional Templates",
                description:
                  "Choose from dozens of professionally designed templates that stand out.",
              },
              {
                icon: Upload,
                title: "Import Existing",
                description:
                  "Upload your current resume and let us transform it into something better.",
              },
            ].map((feature, i) => (
              <Card key={i} className="border-border">
                <CardContent className="p-6">
                  <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Templates Preview Section */}
      <section
        id="templates"
        className="border-b border-border bg-muted/30 px-4 py-16 sm:px-6 lg:px-8 lg:py-24"
      >
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-balance">
              Professional templates for every career
            </h2>
            <p className="mt-4 text-lg text-muted-foreground text-pretty">
              Choose from our curated collection of ATS-friendly designs
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              "Modern",
              "Classic",
              "Creative",
              "Executive",
              "Minimalist",
              "Bold",
            ].map((template, i) => (
              <Card
                key={i}
                className="overflow-hidden border-border transition-all hover:shadow-lg"
              >
                <div className="aspect-3/4 bg-linear-to-br from-muted to-muted/50" />
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-foreground">
                      {template}
                    </h3>
                    <Button size="sm" variant="outline">
                      Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section
        id="pricing"
        className="border-b border-border px-4 py-16 sm:px-6 lg:px-8 lg:py-24"
      >
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-balance">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground text-pretty">
              Start free and upgrade when you need advanced features
            </p>
          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-2 lg:gap-12 max-w-4xl mx-auto">
            {/* Free Tier */}
            <Card className="border-border">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold text-foreground">Free</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-5xl font-bold text-foreground">$0</span>
                  <span className="ml-2 text-muted-foreground">/forever</span>
                </div>
                <ul className="mt-8 space-y-4">
                  {[
                    "Professional resume templates",
                    "ATS optimization",
                    "PDF & DOCX export",
                    "AI-powered suggestions",
                    "Basic formatting tools",
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="h-5 w-5 shrink-0 text-primary" />
                      <span className="text-sm text-muted-foreground">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-8 w-full bg-transparent"
                  variant="outline"
                >
                  Get Started
                </Button>
              </CardContent>
            </Card>

            {/* Premium Tier */}
            <Card className="border-primary shadow-lg">
              <CardContent className="p-8">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  Most Popular
                </div>
                <h3 className="text-2xl font-bold text-foreground">Premium</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-5xl font-bold text-foreground">$9</span>
                  <span className="ml-2 text-muted-foreground">/month</span>
                </div>
                <ul className="mt-8 space-y-4">
                  {[
                    "Everything in Free",
                    "Premium design templates",
                    "High-resolution exports",
                    "Cover letter builder",
                    "Job application tracker",
                    "Browser extension",
                    "Priority support",
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="h-5 w-5 shrink-0 text-primary" />
                      <span className="text-sm text-muted-foreground">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button className="mt-8 w-full">Upgrade to Premium</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="border-b border-border bg-muted/30 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-balance">
              Loved by job seekers worldwide
            </h2>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                name: "Sarah Johnson",
                role: "Software Engineer",
                content:
                  "OpenWork helped me land my dream job at a tech startup. The AI suggestions were incredibly helpful!",
              },
              {
                name: "Michael Chen",
                role: "Marketing Manager",
                content:
                  "The templates are professional and modern. I got 3x more interview calls after updating my resume.",
              },
              {
                name: "Emily Rodriguez",
                role: "Product Designer",
                content:
                  "Finally, a resume builder that actually understands design. The free version has everything I needed.",
              },
            ].map((testimonial, i) => (
              <Card key={i} className="border-border">
                <CardContent className="p-6">
                  <div className="mb-4 flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className="h-4 w-4 fill-primary text-primary"
                      />
                    ))}
                  </div>
                  <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
                    "{testimonial.content}"
                  </p>
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {testimonial.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {testimonial.role}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-balance">
            Ready to build your perfect resume?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            Join thousands of job seekers who have already transformed their
            careers
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" className="text-base" asChild>
              <Link href="/builder">Start Building for Free</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base bg-transparent"
            >
              View Examples
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-lg font-semibold text-foreground">
                  OpenWork
                </span>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Build professional resumes that get you hired.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Product</h3>
              <ul className="mt-4 space-y-2">
                <li>
                  <a
                    href="#"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Templates
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Pricing
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Company</h3>
              <ul className="mt-4 space-y-2">
                <li>
                  <a
                    href="#"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    About
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Blog
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Legal</h3>
              <ul className="mt-4 space-y-2">
                <li>
                  <a
                    href="#"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Privacy
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Terms
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-border pt-8 text-center text-sm text-muted-foreground">
            © 2025 OpenWork. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
