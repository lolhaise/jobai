export function calculateMatchScore(
  candidateSkills: string[],
  requiredSkills: string[]
): number {
  if (requiredSkills.length === 0) return 0;
  
  const normalizedCandidateSkills = candidateSkills.map(s => s.toLowerCase().trim());
  const normalizedRequiredSkills = requiredSkills.map(s => s.toLowerCase().trim());
  
  let matchedSkills = 0;
  let partialMatches = 0;
  
  normalizedRequiredSkills.forEach(required => {
    // Check for exact match
    if (normalizedCandidateSkills.includes(required)) {
      matchedSkills++;
    } else {
      // Check for partial matches (e.g., "react" matches "react.js")
      const hasPartialMatch = normalizedCandidateSkills.some(candidate => 
        candidate.includes(required) || required.includes(candidate)
      );
      if (hasPartialMatch) {
        partialMatches++;
      }
    }
  });
  
  // Calculate score: full matches worth 100%, partial matches worth 50%
  const totalScore = (matchedSkills + (partialMatches * 0.5)) / requiredSkills.length;
  return Math.round(totalScore * 100);
}

export function findSkillGaps(
  candidateSkills: string[],
  requiredSkills: string[]
): {
  matched: string[];
  missing: string[];
  additional: string[];
} {
  const normalizedCandidateSkills = candidateSkills.map(s => s.toLowerCase().trim());
  const normalizedRequiredSkills = requiredSkills.map(s => s.toLowerCase().trim());
  
  const matched: string[] = [];
  const missing: string[] = [];
  
  requiredSkills.forEach((skill, index) => {
    const normalizedSkill = normalizedRequiredSkills[index];
    if (normalizedCandidateSkills.includes(normalizedSkill) ||
        normalizedCandidateSkills.some(c => c.includes(normalizedSkill) || normalizedSkill.includes(c))) {
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  });
  
  const additional = candidateSkills.filter(skill => {
    const normalized = skill.toLowerCase().trim();
    return !normalizedRequiredSkills.includes(normalized) &&
           !normalizedRequiredSkills.some(r => r.includes(normalized) || normalized.includes(r));
  });
  
  return { matched, missing, additional };
}

export function calculateExperienceMatch(
  candidateYears: number,
  requiredMinYears: number,
  requiredMaxYears?: number
): number {
  if (candidateYears >= requiredMinYears) {
    if (requiredMaxYears && candidateYears > requiredMaxYears) {
      // Over-qualified, still good but slightly lower score
      return 85;
    }
    return 100;
  }
  
  // Under-qualified, calculate partial score
  const ratio = candidateYears / requiredMinYears;
  return Math.round(ratio * 100);
}

export function calculateEducationMatch(
  candidateDegree: string,
  requiredDegree: string
): number {
  const degreeHierarchy = {
    'high school': 1,
    'associate': 2,
    'bachelor': 3,
    'master': 4,
    'phd': 5,
    'doctorate': 5
  };
  
  const candidateLevel = Object.entries(degreeHierarchy).find(([key]) => 
    candidateDegree.toLowerCase().includes(key)
  )?.[1] || 0;
  
  const requiredLevel = Object.entries(degreeHierarchy).find(([key]) => 
    requiredDegree.toLowerCase().includes(key)
  )?.[1] || 0;
  
  if (candidateLevel >= requiredLevel) {
    return 100;
  } else if (candidateLevel > 0 && requiredLevel > 0) {
    return Math.round((candidateLevel / requiredLevel) * 100);
  }
  
  return 0;
}

export function calculateLocationMatch(
  candidateLocation: string,
  jobLocation: string,
  isRemote: boolean = false
): number {
  if (isRemote) return 100;
  
  const normalizedCandidate = candidateLocation.toLowerCase().trim();
  const normalizedJob = jobLocation.toLowerCase().trim();
  
  // Exact match
  if (normalizedCandidate === normalizedJob) {
    return 100;
  }
  
  // Same city/state (partial match)
  const candidateParts = normalizedCandidate.split(/[,\s]+/);
  const jobParts = normalizedJob.split(/[,\s]+/);
  
  const commonParts = candidateParts.filter(part => 
    jobParts.some(jobPart => part.includes(jobPart) || jobPart.includes(part))
  );
  
  if (commonParts.length > 0) {
    return Math.round((commonParts.length / Math.max(candidateParts.length, jobParts.length)) * 100);
  }
  
  return 0;
}

export function calculateOverallMatch(
  skills: { score: number; weight: number };
  experience: { score: number; weight: number };
  education: { score: number; weight: number };
  location?: { score: number; weight: number };
): number {
  const components = [skills, experience, education];
  if (location) components.push(location);
  
  const totalWeight = components.reduce((sum, comp) => sum + comp.weight, 0);
  const weightedScore = components.reduce((sum, comp) => sum + (comp.score * comp.weight), 0);
  
  return Math.round(weightedScore / totalWeight);
}

export function generateMatchReport(
  candidateProfile: {
    skills: string[];
    experience: number;
    education: string;
    location?: string;
  },
  jobRequirements: {
    skills: string[];
    minExperience: number;
    maxExperience?: number;
    education: string;
    location?: string;
    isRemote?: boolean;
  }
): {
  overallScore: number;
  breakdown: {
    skills: { score: number; details: any };
    experience: { score: number; details: any };
    education: { score: number; details: any };
    location?: { score: number; details: any };
  };
  recommendations: string[];
} {
  // Calculate individual scores
  const skillsScore = calculateMatchScore(candidateProfile.skills, jobRequirements.skills);
  const skillGaps = findSkillGaps(candidateProfile.skills, jobRequirements.skills);
  
  const experienceScore = calculateExperienceMatch(
    candidateProfile.experience,
    jobRequirements.minExperience,
    jobRequirements.maxExperience
  );
  
  const educationScore = calculateEducationMatch(
    candidateProfile.education,
    jobRequirements.education
  );
  
  const locationScore = candidateProfile.location && jobRequirements.location
    ? calculateLocationMatch(
        candidateProfile.location,
        jobRequirements.location,
        jobRequirements.isRemote
      )
    : undefined;
  
  // Calculate overall score
  const overallScore = calculateOverallMatch(
    { score: skillsScore, weight: 40 },
    { score: experienceScore, weight: 30 },
    { score: educationScore, weight: 20 },
    locationScore ? { score: locationScore, weight: 10 } : undefined
  );
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (skillGaps.missing.length > 0) {
    recommendations.push(`Consider learning: ${skillGaps.missing.slice(0, 3).join(', ')}`);
  }
  
  if (experienceScore < 100 && candidateProfile.experience < jobRequirements.minExperience) {
    const yearsNeeded = jobRequirements.minExperience - candidateProfile.experience;
    recommendations.push(`Gain ${yearsNeeded} more year(s) of experience`);
  }
  
  if (educationScore < 100) {
    recommendations.push(`Consider pursuing ${jobRequirements.education} degree`);
  }
  
  if (locationScore && locationScore < 100) {
    recommendations.push('Consider relocation or remote work options');
  }
  
  return {
    overallScore,
    breakdown: {
      skills: {
        score: skillsScore,
        details: skillGaps
      },
      experience: {
        score: experienceScore,
        details: {
          candidate: candidateProfile.experience,
          required: `${jobRequirements.minExperience}${jobRequirements.maxExperience ? `-${jobRequirements.maxExperience}` : '+'} years`
        }
      },
      education: {
        score: educationScore,
        details: {
          candidate: candidateProfile.education,
          required: jobRequirements.education
        }
      },
      ...(locationScore !== undefined && {
        location: {
          score: locationScore,
          details: {
            candidate: candidateProfile.location,
            required: jobRequirements.location,
            remote: jobRequirements.isRemote
          }
        }
      })
    },
    recommendations
  };
}