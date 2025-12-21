"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from "@react-pdf/renderer";

// Register local Inter font
Font.register({
  family: "Inter",
  src: "/inter.ttf",
});

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
    image?: string;
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

// Styles - using local Inter font
const styles = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 10,
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "#ffffff",
    color: "#0a0a0a",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 24,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    width: 60, // Fixed width matching placeholder min-width in HTML
  },
  image: {
    width: "100%",
    height: "auto",
    aspectRatio: "3/4", // 3:4 aspect ratio
    borderRadius: 4,
    objectFit: "contain",
  },
  name: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#0a0a0a",
  },
  headline: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 6,
    color: "#0a0a0a",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  contactRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    fontSize: 9,
    color: "#525252",
  },
  contactItem: {
    marginRight: 8,
  },
  contactSeparator: {
    marginHorizontal: 4,
    color: "#a1a1aa",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    color: "#0a0a0a",
  },
  summary: {
    fontSize: 10,
    lineHeight: 1.5,
    color: "#374151",
  },
  experienceItem: {
    marginBottom: 12,
  },
  experienceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  companyPosition: {
    flexDirection: "column",
  },
  company: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0a0a0a",
  },
  position: {
    fontSize: 10,
    color: "#525252",
  },
  dateLocation: {
    fontSize: 9,
    color: "#6b7280",
    textAlign: "right",
  },
  bulletList: {
    marginTop: 4,
    paddingLeft: 12,
  },
  bulletItem: {
    flexDirection: "row",
    marginBottom: 2,
  },
  bullet: {
    width: 8,
    fontSize: 10,
    color: "#525252",
  },
  bulletText: {
    flex: 1,
    fontSize: 9,
    lineHeight: 1.4,
    color: "#374151",
  },
  educationItem: {
    marginBottom: 8,
  },
  educationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  institution: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0a0a0a",
  },
  degree: {
    fontSize: 10,
    color: "#374151",
  },
  skillsContainer: {
    flexDirection: "row",
    gap: 24,
  },
  skillSection: {
    flex: 1,
  },
  skillLabel: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#0a0a0a",
  },
  skillItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  skillItem: {
    fontSize: 9,
    color: "#374151",
  },
});

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

interface LayoutConfig {
  id: string;
  fontSize: number;
  headerSize: number;
  roleSize: number;
  sectionHeaderSize: number;
  sectionMargin: number;
  itemMargin: number;
  lineHeight: number;
  padding: number;
  gap: number;
}

interface ResumePDFProps {
  resume: MetaResume;
  layout?: LayoutConfig;
  improvingState?: {
    section?: string;
    field?: string;
    identifier?: string;
    isGlobal?: boolean;
  } | null;
}

// Helper PDF Skeleton Components
interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  style?: any;
}

const SkeletonBlock = ({ width = "100%", height = 10, style = {} }: SkeletonProps) => (
  <View style={{ width, height, backgroundColor: "#e5e7eb", borderRadius: 2, ...style }} />
);

const SkeletonLines = ({ count = 3, height = 8, gap = 4, width = "100%" }: { count?: number, height?: number, gap?: number, width?: string | number }) => (
  <View style={{ gap }}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonBlock key={i} width={width} height={height} />
    ))}
  </View>
);

export const ResumePDF = ({ resume, layout, improvingState }: ResumePDFProps) => {
  const fullName =
    `${resume.personal.firstName} ${resume.personal.lastName}`.trim();
  const headline =
    resume.personal.headline || resume.experience[0]?.position || "";

  const contactItems = [
    resume.personal.location,
    resume.personal.email,
    resume.personal.phone,
    resume.personal.linkedin,
  ].filter(Boolean);

  const hasExperience = resume.experience.some(
    (exp) => exp.company || exp.position,
  );
  const hasEducation = resume.education.some(
    (edu) => edu.institution || edu.degree,
  );
  const hasSkills =
    (resume.skills.technical?.length ?? 0) > 0 ||
    (resume.skills.languages?.length ?? 0) > 0;

  // Dynamic Image Size Calculation
  // Standard width is 60pt for 10pt font (6x multiplier)
  const baseFontSize = layout?.fontSize || 10;
  const imageWidth = baseFontSize * 6;
  const imageHeight = imageWidth * (4 / 3);

  return (
    <Document>
      <Page
        size="A4"
        style={{
          ...styles.page,
          padding: layout?.padding || 20,
          fontSize: layout?.fontSize || 10,
        }}
      >
        {/* Header */}
        <View
          style={{
            ...styles.headerContainer,
            marginBottom: layout?.sectionMargin || 16,
            gap: layout?.gap || 24,
          }}
        >
          <View style={styles.headerLeft}>
            {fullName && (
              <Text
                style={{
                  ...styles.name,
                  fontSize: layout?.headerSize || 28,
                }}
              >
                {fullName}
              </Text>
            )}
            {headline && (
              <Text
                style={{
                  ...styles.headline,
                  fontSize: layout?.roleSize || 12,
                }}
              >
                {headline}
              </Text>
            )}
            {contactItems.length > 0 && (
              <View style={styles.contactRow}>
                {contactItems.map((item, idx) => (
                  <Text key={idx} style={styles.contactItem}>
                    {item}
                    {idx < contactItems.length - 1 && " | "}
                  </Text>
                ))}
              </View>
            )}
          </View>
          {resume.personal.image && (
            <View
              style={{
                width: imageWidth,
                height: imageHeight,
              }}
            >
              <Image
                src={resume.personal.image}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: 4,
                }}
              />
            </View>
          )}
        </View>

        {/* Summary */}
        {(resume.personal.summary || improvingState?.section === "summary") && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Summary</Text>
            {improvingState?.section === "summary" ? (
              <View style={{ gap: 4 }}>
                <SkeletonBlock height={10} width="100%" />
                <SkeletonBlock height={10} width="95%" />
                <SkeletonBlock height={10} width="90%" />
              </View>
            ) : (
              <Text style={styles.summary}>{resume.personal.summary}</Text>
            )}
          </View>
        )}

        {/* Experience */}
        {hasExperience && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional Experience</Text>
            {resume.experience.map(
              (exp, idx) =>
                (exp.company || exp.position) && (
                  <View key={idx} style={styles.experienceItem}>
                    <View style={styles.experienceHeader}>
                      <View style={styles.companyPosition}>
                        {exp.company && (
                          <Text style={styles.company}>{exp.company}</Text>
                        )}
                        {exp.position && (
                          <Text style={styles.position}>{exp.position}</Text>
                        )}
                      </View>
                      <View>
                        <Text style={styles.dateLocation}>
                          {formatDate(exp.startDate)}
                          {exp.startDate && " - "}
                          {exp.current ? "Present" : formatDate(exp.endDate)}
                        </Text>
                        {exp.location && (
                          <Text style={styles.dateLocation}>
                            {exp.location}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Description: Either Text or Skeleton */}
                    {(improvingState?.section === "experience" && improvingState?.identifier === idx.toString()) ? (
                      <View style={styles.bulletList}>
                        <View style={{ marginBottom: 4, flexDirection: "row", gap: 8 }}>
                          <SkeletonBlock width={8} height={8} style={{ marginTop: 2 }} />
                          <SkeletonBlock height={8} width="90%" />
                        </View>
                        <View style={{ marginBottom: 4, flexDirection: "row", gap: 8 }}>
                          <SkeletonBlock width={8} height={8} style={{ marginTop: 2 }} />
                          <SkeletonBlock height={8} width="85%" />
                        </View>
                        <View style={{ marginBottom: 4, flexDirection: "row", gap: 8 }}>
                          <SkeletonBlock width={8} height={8} style={{ marginTop: 2 }} />
                          <SkeletonBlock height={8} width="88%" />
                        </View>
                      </View>
                    ) : (
                      exp.description.length > 0 && (
                        <View style={styles.bulletList}>
                          {exp.description.map((bullet, bulletIdx) => (
                            <View key={bulletIdx} style={styles.bulletItem}>
                              <Text style={styles.bullet}>•</Text>
                              <Text style={styles.bulletText}>{bullet}</Text>
                            </View>
                          ))}
                        </View>
                      )
                    )}
                  </View>
                ),
            )}
          </View>
        )}

        {/* Education */}
        {hasEducation && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            {resume.education.map(
              (edu, idx) =>
                (edu.institution || edu.degree) && (
                  <View key={idx} style={styles.educationItem}>
                    <View style={styles.educationHeader}>
                      <View>
                        {edu.institution && (
                          <Text style={styles.institution}>
                            {edu.institution}
                          </Text>
                        )}
                        <Text style={styles.degree}>
                          {[edu.degree, edu.field].filter(Boolean).join(" in ")}
                        </Text>
                      </View>
                      <Text style={styles.dateLocation}>
                        {formatDate(edu.startDate)}
                        {edu.startDate && edu.endDate && " - "}
                        {formatDate(edu.endDate)}
                      </Text>
                    </View>
                  </View>
                ),
            )}
          </View>
        )}

        {/* Skills */}
        {hasSkills && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.skillsContainer}>
              {(resume.skills.languages?.length ?? 0) > 0 && (
                <View style={styles.skillSection}>
                  <Text style={styles.skillLabel}>Languages</Text>
                  <Text style={styles.skillItem}>
                    {resume.skills.languages?.join(", ")}
                  </Text>
                </View>
              )}
              {(resume.skills.technical?.length ?? 0) > 0 && (
                <View style={styles.skillSection}>
                  <Text style={styles.skillLabel}>Technical Skills</Text>
                  <Text style={styles.skillItem}>
                    {resume.skills.technical?.join(", ")}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
};

export default ResumePDF;
