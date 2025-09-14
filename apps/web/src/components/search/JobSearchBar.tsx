// Job Search Bar Component
// Main search interface with autocomplete and quick filters

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, MapPin, Briefcase, DollarSign, Clock, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import debounce from 'lodash/debounce';

interface JobSearchBarProps {
  onSearch: (params: SearchParams) => void; // Callback when search is triggered
  initialValues?: SearchParams; // Initial search values
  className?: string; // Additional CSS classes
}

interface SearchParams {
  query?: string; // Main search query
  location?: string; // Location filter
  remoteOnly?: boolean; // Remote only filter
  minSalary?: number; // Minimum salary
  maxSalary?: number; // Maximum salary
}

interface Suggestion {
  type: 'job' | 'company' | 'skill' | 'location'; // Suggestion type
  value: string; // Suggestion value
}

export function JobSearchBar({
  onSearch,
  initialValues = {},
  className,
}: JobSearchBarProps) {
  // State management
  const [query, setQuery] = useState(initialValues.query || '');
  const [location, setLocation] = useState(initialValues.location || '');
  const [remoteOnly, setRemoteOnly] = useState(initialValues.remoteOnly || false);
  const [minSalary, setMinSalary] = useState(initialValues.minSalary?.toString() || '');
  const [maxSalary, setMaxSalary] = useState(initialValues.maxSalary?.toString() || '');
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);

  /**
   * Fetch search suggestions from API
   */
  const fetchSuggestions = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        // Fetch suggestions for different types
        const [jobSuggestions, companySuggestions, skillSuggestions] = await Promise.all([
          fetch(`/api/search/suggestions?query=${searchQuery}&type=job`).then(r => r.json()),
          fetch(`/api/search/suggestions?query=${searchQuery}&type=company`).then(r => r.json()),
          fetch(`/api/search/suggestions?query=${searchQuery}&type=skill`).then(r => r.json()),
        ]);

        // Combine and format suggestions
        const combined: Suggestion[] = [
          ...jobSuggestions.slice(0, 3).map((s: string) => ({ type: 'job' as const, value: s })),
          ...companySuggestions.slice(0, 2).map((s: string) => ({ type: 'company' as const, value: s })),
          ...skillSuggestions.slice(0, 3).map((s: string) => ({ type: 'skill' as const, value: s })),
        ];

        setSuggestions(combined);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  /**
   * Handle query input change
   */
  const handleQueryChange = (value: string) => {
    setQuery(value);
    fetchSuggestions(value);
  };

  /**
   * Handle suggestion selection
   */
  const handleSuggestionSelect = (suggestion: Suggestion) => {
    setQuery(suggestion.value);
    setShowSuggestions(false);
    handleSearch();
  };

  /**
   * Handle search submission
   */
  const handleSearch = () => {
    const params: SearchParams = {
      query: query || undefined,
      location: location || undefined,
      remoteOnly: remoteOnly || undefined,
      minSalary: minSalary ? parseInt(minSalary) : undefined,
      maxSalary: maxSalary ? parseInt(maxSalary) : undefined,
    };

    onSearch(params);
    setShowSuggestions(false);
  };

  /**
   * Handle enter key press
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  /**
   * Clear all filters
   */
  const clearFilters = () => {
    setQuery('');
    setLocation('');
    setRemoteOnly(false);
    setMinSalary('');
    setMaxSalary('');
    onSearch({});
  };

  /**
   * Count active filters
   */
  const activeFilterCount = [
    location,
    remoteOnly,
    minSalary,
    maxSalary,
  ].filter(Boolean).length;

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* Main search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search job titles, companies, or skills..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => query.length >= 2 && setShowSuggestions(true)}
            className="pl-10 pr-4"
          />
          
          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover p-1 shadow-md">
              <Command>
                <CommandList>
                  <CommandGroup>
                    {suggestions.map((suggestion, index) => (
                      <CommandItem
                        key={index}
                        onSelect={() => handleSuggestionSelect(suggestion)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          {suggestion.type === 'job' && <Briefcase className="h-3 w-3" />}
                          {suggestion.type === 'company' && <Building className="h-3 w-3" />}
                          {suggestion.type === 'skill' && <Code className="h-3 w-3" />}
                          <span className="flex-1">{suggestion.value}</span>
                          <span className="text-xs text-muted-foreground">
                            {suggestion.type}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
          )}
        </div>

        {/* Location input */}
        <div className="relative w-64">
          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Location or Remote"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10"
          />
        </div>

        {/* Filter button */}
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="relative"
        >
          Filters
          {activeFilterCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-2 -top-2 h-5 w-5 rounded-full p-0 text-xs"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {/* Search button */}
        <Button onClick={handleSearch}>
          Search Jobs
        </Button>
      </div>

      {/* Quick filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Remote only toggle */}
        <Button
          variant={remoteOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setRemoteOnly(!remoteOnly)}
        >
          <MapPin className="mr-1 h-3 w-3" />
          Remote Only
        </Button>

        {/* Popular searches */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Popular:
          {['Software Engineer', 'Product Manager', 'Data Scientist', 'Designer'].map((term) => (
            <Button
              key={term}
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuery(term);
                handleSearch();
              }}
            >
              {term}
            </Button>
          ))}
        </div>

        {/* Clear filters */}
        {(query || location || activeFilterCount > 0) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="ml-auto"
          >
            <X className="mr-1 h-3 w-3" />
            Clear All
          </Button>
        )}
      </div>

      {/* Advanced filters panel */}
      {showFilters && (
        <div className="rounded-lg border bg-muted/50 p-4">
          <h3 className="mb-3 font-semibold">Advanced Filters</h3>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Salary range */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Minimum Salary
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="50000"
                  value={minSalary}
                  onChange={(e) => setMinSalary(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Maximum Salary
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="150000"
                  value={maxSalary}
                  onChange={(e) => setMaxSalary(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Posted date */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Posted Within
              </label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Any time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Last 24 hours</SelectItem>
                  <SelectItem value="3">Last 3 days</SelectItem>
                  <SelectItem value="7">Last week</SelectItem>
                  <SelectItem value="14">Last 2 weeks</SelectItem>
                  <SelectItem value="30">Last month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Apply filters button */}
            <div className="flex items-end">
              <Button onClick={handleSearch} className="w-full">
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Missing imports that need to be added
import { Building, Code } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';