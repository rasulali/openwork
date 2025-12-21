import { type NextRequest, NextResponse } from "next/server";

const API_ENDPOINT = process.env.API_ENDPOINT || "http://localhost:11434";
const IMPROVE_MODEL = "deepseek-r1:32b";

export async function POST(request: NextRequest) {
  try {
    const { resume, jobDescription, section, field, identifier, customPrompt, generateFromScratch } = await request.json();

    if (!resume && !generateFromScratch) {
      return NextResponse.json(
        { error: "Resume data is required" },
        { status: 400 }
      );
    }

    const isPartialUpdate = !!section;
    const hasJobDescription = jobDescription && jobDescription.trim().length > 0;

    let systemPrompt = "";

    if (isPartialUpdate) {
      // GRANULAR UPDATE PROMPT
      const targetContext = identifier
        ? `${section} (ID/Index: ${identifier}) -> ${field}`
        : `${section} -> ${field}`;

      const instruction = customPrompt
        ? `User Request: ${customPrompt}\nTask: Edit the specific part defined below solely based on the User Request above.`
        : `Task: Improve the specific part identified below for better quality, professional impact, and clarity.`;

      systemPrompt = `You are an expert professional assistant.
Context: The following is a full professional resume.
${instruction}

Target Part: "${targetContext}"
${hasJobDescription ? `Relevant Job Description: ${jobDescription}` : ""}

Full Resume Context for reference:
${JSON.stringify(resume, null, 2)}

Strict Requirements:
1. Return ONLY the edited/improved content for the specified target part.
2. For list fields (e.g. bullet points), return a valid JSON array of strings: ["bullet 1", "bullet 2"].
3. For string fields (e.g. summary), return ONLY the text as a raw string.
4. DO NOT return the full resume JSON.
5. DO NOT use markdown code blocks or formatting.
6. DO NOT include any conversational filler or explanation.
`;
    } else if (generateFromScratch) {
      // GENERATE FROM SCRATCH PROMPT
      systemPrompt = `You are an expert resume writer and ATS optimization specialist.
Your task is to generate a professional resume based on the provided information.

${hasJobDescription
          ? `Information provided:
${jobDescription}

Generate a resume tailored to this information. Use the information provided to fill in relevant sections. For any information NOT provided, leave those fields empty (empty strings for text fields, empty arrays for list fields).`
          : `Generate a professional resume structure. Since no specific information was provided, create a template with empty fields.`
        }

Return ONLY valid JSON matching this exact structure:
{
  "personal": {
    "firstName": "",
    "lastName": "",
    "headline": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedin": "",
    "summary": "",
    "image": ""
  },
  "experience": [
    {
      "id": "1",
      "company": "",
      "position": "",
      "location": "",
      "startDate": "",
      "endDate": "",
      "current": false,
      "description": []
    }
  ],
  "education": [
    {
      "id": "1",
      "institution": "",
      "degree": "",
      "field": "",
      "startDate": "",
      "endDate": ""
    }
  ],
  "skills": {
    "technical": [],
    "languages": []
  }
}

CRITICAL: Only fill in fields for which you have clear information from the provided input. Leave all other fields empty. Do NOT make up information.
Do NOT use markdown formatting (like \`\`\`json).
Do NOT include any explanations or conversational text.
`;
    } else {
      // GLOBAL UPDATE PROMPT (Existing Logic)
      systemPrompt = `You are an expert resume writer and ATS optimization specialist.
Your task is to improve the following resume content.
        ${hasJobDescription
          ? `Tailor the resume specifically for the provided Job Description (JD). Use keywords from the JD, highlight relevant skills, and rewrite bullet points to align with the role.`
          : `Improve the resume for general best practices, focusing on ATS optimization, stronger action verbs, and quantifiable impact.`
        }

Current Resume:
${JSON.stringify(resume, null, 2)}

${hasJobDescription
          ? `
Job Description:
${jobDescription}
`
          : ""
        }

Return ONLY valid JSON matching the exact structure of the input resume.
Do NOT use markdown formatting(like \`\`\`json).
Do NOT include any explanations or conversational text.
Ensure all fields from the input resume are present in the output, even if unchanged.
Improve the content within the "experience", "education", "skills", and "summary" sections.
Maintain the same "id" values for experience and education entries.
`;
    }

    console.log(`Sending request to DeepSeek (Partial: ${isPartialUpdate})...`);

    const response = await fetch(`${API_ENDPOINT}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: IMPROVE_MODEL,
        messages: [
          {
            role: "user",
            content: systemPrompt,
          },
        ],
        stream: false,
        options: {
          temperature: 0.3,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DeepSeek API Error:", response.status, errorText);
      throw new Error(`AI processing failed: ${response.statusText}`);
    }

    const data = await response.json();
    let improvedContent = data.message?.content || "";

    // Cleanup potential markdown or thinking process artifacts
    improvedContent = improvedContent
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      .trim();

    // Attempt to extract JSON if it's wrapped in text
    const jsonMatch = improvedContent.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      improvedContent = jsonMatch[0];
    }

    let responseData;
    try {
      if (isPartialUpdate) {
        // For partial updates, we might expect a raw string OR a JSON array (for bullets)
        // Try parsing as JSON first (for arrays), if fails, treat as string
        try {
          responseData = JSON.parse(improvedContent);
        } catch {
          responseData = improvedContent; // It's likely just a plain string
        }
      } else {
        responseData = JSON.parse(improvedContent);
      }
    } catch (parseError) {
      console.error("Parse Error:", parseError);
      console.error("Received Content:", improvedContent);
      throw new Error("Failed to parse AI response");
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("Error improving resume:", error);
    return NextResponse.json(
      {
        error: "Failed to improve resume",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
