"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
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
  header: {
    marginBottom: 16,
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

interface ResumePDFProps {
  resume: MetaResume;
}

export const ResumePDF = ({ resume }: ResumePDFProps) => {
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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {fullName && <Text style={styles.name}>{fullName}</Text>}
          {headline && <Text style={styles.headline}>{headline}</Text>}
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

        {/* Summary */}
        {resume.personal.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.summary}>{resume.personal.summary}</Text>
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
                    {exp.description.length > 0 && (
                      <View style={styles.bulletList}>
                        {exp.description.map((bullet, bulletIdx) => (
                          <View key={bulletIdx} style={styles.bulletItem}>
                            <Text style={styles.bullet}>•</Text>
                            <Text style={styles.bulletText}>{bullet}</Text>
                          </View>
                        ))}
                      </View>
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
