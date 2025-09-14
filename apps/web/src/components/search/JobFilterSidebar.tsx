// Job Filter Sidebar Component
// Advanced filtering options with aggregations

'use client';

import { useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';

interface JobFilterSidebarProps {
  aggregations: SearchAggregations; // Aggregation data from search
  filters: FilterState; // Current filter state
  onFilterChange: (filters: FilterState) => void; // Callback when filters change
  onClearFilters: () => void; // Callback to clear all filters
}

interface SearchAggregations {
  experienceLevels: AggregationItem[]; // Experience level counts
  employmentTypes: AggregationItem[]; // Employment type counts
  topCompanies: AggregationItem[]; // Top companies
  topSkills: AggregationItem[]; // Top skills
  salaryRanges: SalaryRangeItem[]; // Salary distributions
  locations: AggregationItem[]; // Top locations
}

interface AggregationItem {
  value: string; // Filter value
  count: number; // Number of jobs
}

interface SalaryRangeItem {
  min: number; // Min salary
  max: number | null; // Max salary (null for "over X")
  label: string; // Display label
  count: number; // Number of jobs
}

interface FilterState {
  experienceLevel?: string[]; // Selected experience levels
  employmentType?: string[]; // Selected employment types
  companies?: string[]; // Selected companies
  skills?: string[]; // Selected skills
  salaryRange?: [number, number]; // Min and max salary
  locations?: string[]; // Selected locations
  remoteOnly?: boolean; // Remote only filter
  postedWithin?: number; // Days since posted
}

export function JobFilterSidebar({
  aggregations,
  filters,
  onFilterChange,
  onClearFilters,
}: JobFilterSidebarProps) {
  // Local state for temporary filter changes
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  /**
   * Handle filter change
   */
  const handleFilterChange = (key: keyof FilterState, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  /**
   * Apply filters
   */
  const applyFilters = () => {
    onFilterChange(localFilters);
  };

  /**
   * Reset filters
   */
  const resetFilters = () => {
    setLocalFilters({});
    onClearFilters();
  };

  /**
   * Count active filters
   */
  const activeFilterCount = Object.values(localFilters).filter(
    (value) => value && (Array.isArray(value) ? value.length > 0 : true)
  ).length;

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Filters</h2>
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{activeFilterCount} active</Badge>
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Clear all
            </Button>
          </div>
        )}
      </div>

      <Separator />

      {/* Filters */}
      <ScrollArea className="h-[calc(100vh-200px)]">
        <Accordion type="multiple" defaultValue={['experience', 'employment', 'salary']} className="w-full">
          
          {/* Experience Level */}
          <AccordionItem value="experience">
            <AccordionTrigger>
              Experience Level
              {localFilters.experienceLevel?.length ? (
                <Badge className="ml-auto mr-2" variant="secondary">
                  {localFilters.experienceLevel.length}
                </Badge>
              ) : null}
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {aggregations.experienceLevels.map((item) => (
                  <div key={item.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`exp-${item.value}`}
                      checked={localFilters.experienceLevel?.includes(item.value) || false}
                      onCheckedChange={(checked) => {
                        const current = localFilters.experienceLevel || [];
                        const updated = checked
                          ? [...current, item.value]
                          : current.filter((v) => v !== item.value);
                        handleFilterChange('experienceLevel', updated);
                      }}
                    />
                    <Label
                      htmlFor={`exp-${item.value}`}
                      className="flex w-full cursor-pointer justify-between"
                    >
                      <span>{formatExperienceLevel(item.value)}</span>
                      <span className="text-muted-foreground">({item.count})</span>
                    </Label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Employment Type */}
          <AccordionItem value="employment">
            <AccordionTrigger>
              Employment Type
              {localFilters.employmentType?.length ? (
                <Badge className="ml-auto mr-2" variant="secondary">
                  {localFilters.employmentType.length}
                </Badge>
              ) : null}
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {aggregations.employmentTypes.map((item) => (
                  <div key={item.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`emp-${item.value}`}
                      checked={localFilters.employmentType?.includes(item.value) || false}
                      onCheckedChange={(checked) => {
                        const current = localFilters.employmentType || [];
                        const updated = checked
                          ? [...current, item.value]
                          : current.filter((v) => v !== item.value);
                        handleFilterChange('employmentType', updated);
                      }}
                    />
                    <Label
                      htmlFor={`emp-${item.value}`}
                      className="flex w-full cursor-pointer justify-between"
                    >
                      <span>{formatEmploymentType(item.value)}</span>
                      <span className="text-muted-foreground">({item.count})</span>
                    </Label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Salary Range */}
          <AccordionItem value="salary">
            <AccordionTrigger>
              Salary Range
              {localFilters.salaryRange ? (
                <Badge className="ml-auto mr-2" variant="secondary">
                  Set
                </Badge>
              ) : null}
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  {aggregations.salaryRanges.map((range) => (
                    <div key={range.label} className="flex justify-between text-sm">
                      <span>{range.label}</span>
                      <span className="text-muted-foreground">({range.count})</span>
                    </div>
                  ))}
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <Label>Custom Range</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {formatCurrency(localFilters.salaryRange?.[0] || 0)}
                    </span>
                    <Slider
                      min={0}
                      max={300000}
                      step={10000}
                      value={localFilters.salaryRange || [0, 300000]}
                      onValueChange={(value) => handleFilterChange('salaryRange', value)}
                      className="flex-1"
                    />
                    <span className="text-sm">
                      {formatCurrency(localFilters.salaryRange?.[1] || 300000)}
                    </span>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Top Companies */}
          <AccordionItem value="companies">
            <AccordionTrigger>
              Companies
              {localFilters.companies?.length ? (
                <Badge className="ml-auto mr-2" variant="secondary">
                  {localFilters.companies.length}
                </Badge>
              ) : null}
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {aggregations.topCompanies.map((item) => (
                  <div key={item.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`company-${item.value}`}
                      checked={localFilters.companies?.includes(item.value) || false}
                      onCheckedChange={(checked) => {
                        const current = localFilters.companies || [];
                        const updated = checked
                          ? [...current, item.value]
                          : current.filter((v) => v !== item.value);
                        handleFilterChange('companies', updated);
                      }}
                    />
                    <Label
                      htmlFor={`company-${item.value}`}
                      className="flex w-full cursor-pointer justify-between"
                    >
                      <span className="truncate">{item.value}</span>
                      <span className="text-muted-foreground">({item.count})</span>
                    </Label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Skills */}
          <AccordionItem value="skills">
            <AccordionTrigger>
              Skills
              {localFilters.skills?.length ? (
                <Badge className="ml-auto mr-2" variant="secondary">
                  {localFilters.skills.length}
                </Badge>
              ) : null}
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {aggregations.topSkills.slice(0, 15).map((item) => (
                  <div key={item.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`skill-${item.value}`}
                      checked={localFilters.skills?.includes(item.value) || false}
                      onCheckedChange={(checked) => {
                        const current = localFilters.skills || [];
                        const updated = checked
                          ? [...current, item.value]
                          : current.filter((v) => v !== item.value);
                        handleFilterChange('skills', updated);
                      }}
                    />
                    <Label
                      htmlFor={`skill-${item.value}`}
                      className="flex w-full cursor-pointer justify-between"
                    >
                      <span>{item.value}</span>
                      <span className="text-muted-foreground">({item.count})</span>
                    </Label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Location */}
          <AccordionItem value="location">
            <AccordionTrigger>
              Location
              {localFilters.locations?.length ? (
                <Badge className="ml-auto mr-2" variant="secondary">
                  {localFilters.locations.length}
                </Badge>
              ) : null}
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {/* Remote toggle */}
                <div className="flex items-center space-x-2 pb-2">
                  <Checkbox
                    id="remote-only"
                    checked={localFilters.remoteOnly || false}
                    onCheckedChange={(checked) => handleFilterChange('remoteOnly', checked)}
                  />
                  <Label htmlFor="remote-only" className="cursor-pointer font-medium">
                    Remote Only
                  </Label>
                </div>
                
                <Separator />
                
                {/* Location list */}
                {aggregations.locations.map((item) => (
                  <div key={item.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`loc-${item.value}`}
                      checked={localFilters.locations?.includes(item.value) || false}
                      onCheckedChange={(checked) => {
                        const current = localFilters.locations || [];
                        const updated = checked
                          ? [...current, item.value]
                          : current.filter((v) => v !== item.value);
                        handleFilterChange('locations', updated);
                      }}
                    />
                    <Label
                      htmlFor={`loc-${item.value}`}
                      className="flex w-full cursor-pointer justify-between"
                    >
                      <span className="truncate">{item.value}</span>
                      <span className="text-muted-foreground">({item.count})</span>
                    </Label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Posted Date */}
          <AccordionItem value="posted">
            <AccordionTrigger>
              Date Posted
              {localFilters.postedWithin ? (
                <Badge className="ml-auto mr-2" variant="secondary">
                  Set
                </Badge>
              ) : null}
            </AccordionTrigger>
            <AccordionContent>
              <RadioGroup
                value={localFilters.postedWithin?.toString() || ''}
                onValueChange={(value) => handleFilterChange('postedWithin', parseInt(value))}
              >
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="1" id="posted-1" />
                    <Label htmlFor="posted-1" className="cursor-pointer">
                      Last 24 hours
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="3" id="posted-3" />
                    <Label htmlFor="posted-3" className="cursor-pointer">
                      Last 3 days
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="7" id="posted-7" />
                    <Label htmlFor="posted-7" className="cursor-pointer">
                      Last week
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="14" id="posted-14" />
                    <Label htmlFor="posted-14" className="cursor-pointer">
                      Last 2 weeks
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="30" id="posted-30" />
                    <Label htmlFor="posted-30" className="cursor-pointer">
                      Last month
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </ScrollArea>

      {/* Apply button */}
      <div className="space-y-2 pt-4">
        <Button onClick={applyFilters} className="w-full">
          Apply Filters
        </Button>
        {activeFilterCount > 0 && (
          <Button variant="outline" onClick={resetFilters} className="w-full">
            Clear All Filters
          </Button>
        )}
      </div>
    </div>
  );
}

// Helper functions
function formatExperienceLevel(level: string): string {
  const map: Record<string, string> = {
    INTERNSHIP: 'Internship',
    ENTRY: 'Entry Level',
    MID: 'Mid Level',
    SENIOR: 'Senior Level',
    LEAD: 'Lead',
    EXECUTIVE: 'Executive',
  };
  return map[level] || level;
}

function formatEmploymentType(type: string): string {
  const map: Record<string, string> = {
    FULL_TIME: 'Full Time',
    PART_TIME: 'Part Time',
    CONTRACT: 'Contract',
    INTERNSHIP: 'Internship',
    FREELANCE: 'Freelance',
    TEMPORARY: 'Temporary',
  };
  return map[type] || type;
}