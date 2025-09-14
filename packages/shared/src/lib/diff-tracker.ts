import { diff_match_patch } from 'diff-match-patch';

export interface ResumeDiff {
  field: string;
  oldValue: any;
  newValue: any;
  changeType: 'added' | 'removed' | 'modified';
  timestamp: Date;
}

export interface VersionDiff {
  changes: ResumeDiff[];
  summary: string;
  changeCount: number;
  addedFields: string[];
  removedFields: string[];
  modifiedFields: string[];
}

export class ResumeDiffTracker {
  private dmp = new diff_match_patch();

  /**
   * Compare two resume versions and generate a diff
   */
  compareVersions(oldResume: any, newResume: any): VersionDiff {
    const changes: ResumeDiff[] = [];
    const addedFields: string[] = [];
    const removedFields: string[] = [];
    const modifiedFields: string[] = [];

    // Compare all fields
    const allFields = new Set([
      ...Object.keys(oldResume || {}),
      ...Object.keys(newResume || {})
    ]);

    allFields.forEach(field => {
      // Skip metadata fields
      if (['id', 'userId', 'createdAt', 'updatedAt'].includes(field)) {
        return;
      }

      const oldValue = oldResume?.[field];
      const newValue = newResume?.[field];

      if (oldValue === undefined && newValue !== undefined) {
        // Field added
        changes.push({
          field,
          oldValue: null,
          newValue,
          changeType: 'added',
          timestamp: new Date()
        });
        addedFields.push(field);
      } else if (oldValue !== undefined && newValue === undefined) {
        // Field removed
        changes.push({
          field,
          oldValue,
          newValue: null,
          changeType: 'removed',
          timestamp: new Date()
        });
        removedFields.push(field);
      } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        // Field modified
        changes.push({
          field,
          oldValue,
          newValue,
          changeType: 'modified',
          timestamp: new Date()
        });
        modifiedFields.push(field);
      }
    });

    return {
      changes,
      summary: this.generateSummary(changes),
      changeCount: changes.length,
      addedFields,
      removedFields,
      modifiedFields
    };
  }

  /**
   * Generate a text diff for string fields
   */
  getTextDiff(oldText: string, newText: string): string {
    const diffs = this.dmp.diff_main(oldText || '', newText || '');
    this.dmp.diff_cleanupSemantic(diffs);
    return this.dmp.diff_prettyHtml(diffs);
  }

  /**
   * Generate a human-readable summary of changes
   */
  private generateSummary(changes: ResumeDiff[]): string {
    if (changes.length === 0) {
      return 'No changes detected';
    }

    const summaryParts: string[] = [];
    
    const fieldChanges = changes.reduce((acc, change) => {
      if (!acc[change.field]) {
        acc[change.field] = [];
      }
      acc[change.field].push(change.changeType);
      return acc;
    }, {} as Record<string, string[]>);

    Object.entries(fieldChanges).forEach(([field, types]) => {
      const fieldName = this.formatFieldName(field);
      if (types.includes('added')) {
        summaryParts.push(`Added ${fieldName}`);
      } else if (types.includes('removed')) {
        summaryParts.push(`Removed ${fieldName}`);
      } else if (types.includes('modified')) {
        summaryParts.push(`Updated ${fieldName}`);
      }
    });

    return summaryParts.join(', ');
  }

  /**
   * Format field name for display
   */
  private formatFieldName(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Track specific changes to experience section
   */
  trackExperienceChanges(oldExp: any[], newExp: any[]): ResumeDiff[] {
    const changes: ResumeDiff[] = [];
    
    // Find added experiences
    newExp?.forEach((exp, index) => {
      const matchingOld = oldExp?.find(
        old => old.company === exp.company && old.title === exp.title
      );
      
      if (!matchingOld) {
        changes.push({
          field: `experience[${index}]`,
          oldValue: null,
          newValue: exp,
          changeType: 'added',
          timestamp: new Date()
        });
      }
    });

    // Find removed experiences
    oldExp?.forEach((exp, index) => {
      const matchingNew = newExp?.find(
        newItem => newItem.company === exp.company && newItem.title === exp.title
      );
      
      if (!matchingNew) {
        changes.push({
          field: `experience[${index}]`,
          oldValue: exp,
          newValue: null,
          changeType: 'removed',
          timestamp: new Date()
        });
      }
    });

    // Find modified experiences
    oldExp?.forEach((exp, index) => {
      const matchingNew = newExp?.find(
        newItem => newItem.company === exp.company && newItem.title === exp.title
      );
      
      if (matchingNew && JSON.stringify(exp) !== JSON.stringify(matchingNew)) {
        changes.push({
          field: `experience[${index}]`,
          oldValue: exp,
          newValue: matchingNew,
          changeType: 'modified',
          timestamp: new Date()
        });
      }
    });

    return changes;
  }

  /**
   * Track skill changes
   */
  trackSkillChanges(oldSkills: string[], newSkills: string[]): {
    added: string[];
    removed: string[];
  } {
    const oldSet = new Set(oldSkills || []);
    const newSet = new Set(newSkills || []);

    const added = [...newSet].filter(skill => !oldSet.has(skill));
    const removed = [...oldSet].filter(skill => !newSet.has(skill));

    return { added, removed };
  }

  /**
   * Generate a version changelog
   */
  generateChangelog(versions: any[]): string {
    const changelog: string[] = [];
    
    for (let i = versions.length - 1; i > 0; i--) {
      const oldVersion = versions[i - 1];
      const newVersion = versions[i];
      const diff = this.compareVersions(oldVersion, newVersion);
      
      changelog.push(`Version ${newVersion.version} (${new Date(newVersion.createdAt).toLocaleDateString()})`);
      changelog.push(diff.summary);
      if (newVersion.versionNotes) {
        changelog.push(`Notes: ${newVersion.versionNotes}`);
      }
      changelog.push('---');
    }
    
    return changelog.join('\n');
  }

  /**
   * Calculate similarity between two resumes
   */
  calculateSimilarity(resume1: any, resume2: any): number {
    const text1 = this.resumeToText(resume1);
    const text2 = this.resumeToText(resume2);
    
    const diffs = this.dmp.diff_main(text1, text2);
    const similarity = this.dmp.diff_levenshtein(diffs);
    const maxLength = Math.max(text1.length, text2.length);
    
    return maxLength === 0 ? 100 : ((maxLength - similarity) / maxLength) * 100;
  }

  /**
   * Convert resume to text for comparison
   */
  private resumeToText(resume: any): string {
    const parts: string[] = [];
    
    if (resume.summary) parts.push(resume.summary);
    if (resume.experience) {
      resume.experience.forEach((exp: any) => {
        parts.push(`${exp.title} at ${exp.company}`);
        if (exp.description) parts.push(exp.description);
      });
    }
    if (resume.education) {
      resume.education.forEach((edu: any) => {
        parts.push(`${edu.degree} from ${edu.school}`);
      });
    }
    if (resume.skills) {
      parts.push(resume.skills.join(', '));
    }
    
    return parts.join('\n');
  }

  /**
   * Merge changes from multiple versions
   */
  mergeVersions(baseVersion: any, ...versions: any[]): any {
    let merged = { ...baseVersion };
    
    versions.forEach(version => {
      const diff = this.compareVersions(merged, version);
      
      // Apply changes
      diff.changes.forEach(change => {
        if (change.changeType === 'added' || change.changeType === 'modified') {
          merged[change.field] = change.newValue;
        } else if (change.changeType === 'removed') {
          delete merged[change.field];
        }
      });
    });
    
    return merged;
  }
}

// Export a singleton instance
export const diffTracker = new ResumeDiffTracker();