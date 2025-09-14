'use client';

// Import React hooks
import { useState } from 'react';

// Import UI components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';

// Import icons
import { Calendar as CalendarIcon, X, Filter, RotateCcw } from 'lucide-react';

// Import date utilities
import { format } from 'date-fns';

// Define interfaces for type safety
interface ApplicationFilters {
  search: string;
  status: string;
  stage: string;
  priority: string;
  tags: string[];
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

interface ApplicationFiltersProps {
  filters: ApplicationFilters;
  onFiltersChange: (filters: ApplicationFilters) => void;
}

// Common tags that users might want to filter by
const COMMON_TAGS = [
  { name: 'Remote', color: '#10B981' },
  { name: 'Startup', color: '#F59E0B' },
  { name: 'Large Company', color: '#3B82F6' },
  { name: 'High Priority', color: '#EF4444' },
  { name: 'Dream Job', color: '#8B5CF6' },
  { name: 'Referral', color: '#06B6D4' },
  { name: 'Cold Apply', color: '#6B7280' },
  { name: 'Follow Up', color: '#F97316' },
];

// ApplicationFilters component
export function ApplicationFilters({ filters, onFiltersChange }: ApplicationFiltersProps) {
  // State for managing date picker
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
  // Handle input changes
  const handleInputChange = (key: keyof ApplicationFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  // Handle tag selection
  const handleTagToggle = (tagName: string) => {
    const updatedTags = filters.tags.includes(tagName)
      ? filters.tags.filter(tag => tag !== tagName)
      : [...filters.tags, tagName];
    
    handleInputChange('tags', updatedTags);
  };

  // Handle date range selection
  const handleDateRangeChange = (range: { from: Date | undefined; to: Date | undefined }) => {
    handleInputChange('dateRange', range);
  };

  // Reset all filters
  const resetFilters = () => {
    onFiltersChange({
      search: '',
      status: 'all',
      stage: 'all',
      priority: 'all',
      tags: [],
      dateRange: {
        from: undefined,
        to: undefined,
      },
    });
  };

  // Check if any filters are active
  const hasActiveFilters = 
    filters.status !== 'all' ||
    filters.stage !== 'all' ||
    filters.priority !== 'all' ||
    filters.tags.length > 0 ||
    filters.dateRange.from ||
    filters.dateRange.to;

  return (
    <div className=\"space-y-6\">
      {/* Filter Header */}
      <div className=\"flex items-center justify-between\">
        <div className=\"flex items-center space-x-2\">
          <Filter className=\"h-4 w-4\" />
          <h3 className=\"font-medium\">Advanced Filters</h3>
          {hasActiveFilters && (
            <Badge variant=\"secondary\" className=\"text-xs\">
              {[
                filters.status !== 'all' ? 1 : 0,
                filters.stage !== 'all' ? 1 : 0,
                filters.priority !== 'all' ? 1 : 0,
                filters.tags.length,
                filters.dateRange.from || filters.dateRange.to ? 1 : 0,
              ].reduce((sum, count) => sum + count, 0)} active
            </Badge>
          )}
        </div>
        
        {hasActiveFilters && (
          <Button
            variant=\"ghost\"
            size=\"sm\"
            onClick={resetFilters}
            className=\"text-muted-foreground hover:text-foreground\"
          >
            <RotateCcw className=\"h-4 w-4 mr-2\" />
            Reset
          </Button>
        )}
      </div>

      {/* Filter Grid */}
      <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6\">
        {/* Status Filter */}
        <div className=\"space-y-2\">
          <Label>Status</Label>
          <Select
            value={filters.status}
            onValueChange={(value) => handleInputChange('status', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder=\"All Status\" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=\"all\">All Status</SelectItem>
              <SelectItem value=\"DRAFT\">Draft</SelectItem>
              <SelectItem value=\"APPLIED\">Applied</SelectItem>
              <SelectItem value=\"IN_PROGRESS\">In Progress</SelectItem>
              <SelectItem value=\"REJECTED\">Rejected</SelectItem>
              <SelectItem value=\"OFFERED\">Offered</SelectItem>
              <SelectItem value=\"ACCEPTED\">Accepted</SelectItem>
              <SelectItem value=\"WITHDRAWN\">Withdrawn</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stage Filter */}
        <div className=\"space-y-2\">
          <Label>Stage</Label>
          <Select
            value={filters.stage}
            onValueChange={(value) => handleInputChange('stage', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder=\"All Stages\" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=\"all\">All Stages</SelectItem>
              <SelectItem value=\"NOT_APPLIED\">Not Applied</SelectItem>
              <SelectItem value=\"APPLIED\">Applied</SelectItem>
              <SelectItem value=\"SCREENING\">Screening</SelectItem>
              <SelectItem value=\"PHONE_SCREEN\">Phone Screen</SelectItem>
              <SelectItem value=\"TECHNICAL\">Technical</SelectItem>
              <SelectItem value=\"ONSITE\">Onsite</SelectItem>
              <SelectItem value=\"FINAL\">Final</SelectItem>
              <SelectItem value=\"OFFER\">Offer</SelectItem>
              <SelectItem value=\"NEGOTIATION\">Negotiation</SelectItem>
              <SelectItem value=\"CLOSED\">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Priority Filter */}
        <div className=\"space-y-2\">
          <Label>Priority</Label>
          <Select
            value={filters.priority}
            onValueChange={(value) => handleInputChange('priority', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder=\"All Priorities\" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=\"all\">All Priorities</SelectItem>
              <SelectItem value=\"URGENT\">Urgent</SelectItem>
              <SelectItem value=\"HIGH\">High</SelectItem>
              <SelectItem value=\"MEDIUM\">Medium</SelectItem>
              <SelectItem value=\"LOW\">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Filter */}
        <div className=\"space-y-2\">
          <Label>Applied Date Range</Label>
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant=\"outline\"
                className={`w-full justify-start text-left font-normal ${
                  !filters.dateRange.from && !filters.dateRange.to && 'text-muted-foreground'
                }`}
              >
                <CalendarIcon className=\"mr-2 h-4 w-4\" />
                {filters.dateRange.from ? (
                  filters.dateRange.to ? (
                    <>
                      {format(filters.dateRange.from, 'LLL dd, y')} -{' '}
                      {format(filters.dateRange.to, 'LLL dd, y')}
                    </>
                  ) : (
                    format(filters.dateRange.from, 'LLL dd, y')
                  )
                ) : (
                  'Pick a date range'
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className=\"w-auto p-0\" align=\"start\">
              <Calendar
                initialFocus
                mode=\"range\"
                defaultMonth={filters.dateRange.from}
                selected={filters.dateRange}
                onSelect={(range) => {
                  handleDateRangeChange(range || { from: undefined, to: undefined });
                  if (range?.from && range?.to) {
                    setIsDatePickerOpen(false);
                  }
                }}
                numberOfMonths={2}
              />
              <div className=\"p-3 border-t\">
                <Button
                  variant=\"ghost\"
                  className=\"w-full\"
                  onClick={() => {
                    handleDateRangeChange({ from: undefined, to: undefined });
                    setIsDatePickerOpen(false);
                  }}
                >
                  Clear Date Range
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Separator />

      {/* Tags Filter */}
      <div className=\"space-y-3\">
        <Label>Filter by Tags</Label>
        <div className=\"flex flex-wrap gap-2\">
          {COMMON_TAGS.map((tag) => {
            const isSelected = filters.tags.includes(tag.name);
            return (
              <Badge
                key={tag.name}
                variant={isSelected ? 'default' : 'outline'}
                className={`cursor-pointer transition-colors ${
                  isSelected ? 'text-white' : 'hover:bg-muted'
                }`}
                style={
                  isSelected
                    ? { backgroundColor: tag.color, borderColor: tag.color }
                    : { borderColor: tag.color, color: tag.color }
                }
                onClick={() => handleTagToggle(tag.name)}
              >
                {tag.name}
                {isSelected && <X className=\"ml-1 h-3 w-3\" />}
              </Badge>
            );
          })}
        </div>
        
        {/* Selected Tags Display */}
        {filters.tags.length > 0 && (
          <div className=\"space-y-2\">
            <Label className=\"text-xs text-muted-foreground\">Selected Tags:</Label>
            <div className=\"flex flex-wrap gap-1\">
              {filters.tags.map((tagName) => {
                const tag = COMMON_TAGS.find(t => t.name === tagName);
                return (
                  <Badge
                    key={tagName}
                    variant=\"default\"
                    className=\"text-white cursor-pointer\"
                    style={{
                      backgroundColor: tag?.color || '#6B7280',
                      borderColor: tag?.color || '#6B7280',
                    }}
                    onClick={() => handleTagToggle(tagName)}
                  >
                    {tagName}
                    <X className=\"ml-1 h-3 w-3\" />
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Additional Options */}
      <div className=\"space-y-3\">
        <Label>Additional Options</Label>
        <div className=\"space-y-3\">
          {/* Favorites Only */}
          <div className=\"flex items-center space-x-2\">
            <Checkbox
              id=\"favorites-only\"
              checked={filters.search.includes('isFavorite:true')}
              onCheckedChange={(checked) => {
                if (checked) {
                  handleInputChange('search', filters.search + ' isFavorite:true');
                } else {
                  handleInputChange('search', filters.search.replace(' isFavorite:true', ''));
                }
              }}
            />
            <Label htmlFor=\"favorites-only\" className=\"text-sm font-normal\">
              Show favorites only
            </Label>
          </div>
          
          {/* Has Follow-up */}
          <div className=\"flex items-center space-x-2\">
            <Checkbox
              id=\"has-followup\"
              checked={filters.search.includes('hasFollowup:true')}
              onCheckedChange={(checked) => {
                if (checked) {
                  handleInputChange('search', filters.search + ' hasFollowup:true');
                } else {
                  handleInputChange('search', filters.search.replace(' hasFollowup:true', ''));
                }
              }}
            />
            <Label htmlFor=\"has-followup\" className=\"text-sm font-normal\">
              Has follow-up scheduled
            </Label>
          </div>
          
          {/* Has Deadline */}
          <div className=\"flex items-center space-x-2\">
            <Checkbox
              id=\"has-deadline\"
              checked={filters.search.includes('hasDeadline:true')}
              onCheckedChange={(checked) => {
                if (checked) {
                  handleInputChange('search', filters.search + ' hasDeadline:true');
                } else {
                  handleInputChange('search', filters.search.replace(' hasDeadline:true', ''));
                }
              }}
            />
            <Label htmlFor=\"has-deadline\" className=\"text-sm font-normal\">
              Has response deadline
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
}