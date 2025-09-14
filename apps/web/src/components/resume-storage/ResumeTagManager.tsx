'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Tag } from 'lucide-react';
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

interface TagManagerProps {
  resumeId: string;
  currentTags: string[];
  availableTags?: { tag: string; count: number }[];
  onUpdateTags: (tags: string[]) => Promise<void>;
  maxTags?: number;
}

export function ResumeTagManager({
  resumeId,
  currentTags = [],
  availableTags = [],
  onUpdateTags,
  maxTags = 10,
}: TagManagerProps) {
  const [tags, setTags] = useState<string[]>(currentTags);
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setTags(currentTags);
  }, [currentTags]);

  const handleAddTag = async (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    
    if (!trimmedTag || tags.includes(trimmedTag)) {
      return;
    }

    if (tags.length >= maxTags) {
      alert(`Maximum ${maxTags} tags allowed`);
      return;
    }

    const newTags = [...tags, trimmedTag];
    setTags(newTags);
    setNewTag('');
    setIsAddingTag(false);
    
    await saveTags(newTags);
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    await saveTags(newTags);
  };

  const saveTags = async (updatedTags: string[]) => {
    setIsSaving(true);
    try {
      await onUpdateTags(updatedTags);
    } catch (error) {
      console.error('Failed to update tags:', error);
      // Revert on error
      setTags(currentTags);
    } finally {
      setIsSaving(false);
    }
  };

  const suggestedTags = availableTags
    .filter(at => !tags.includes(at.tag))
    .slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-medium">Tags</h3>
        <span className="text-sm text-muted-foreground">
          ({tags.length}/{maxTags})
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <Badge
            key={tag}
            variant="secondary"
            className="pl-2 pr-1 py-1 flex items-center gap-1"
          >
            {tag}
            <button
              onClick={() => handleRemoveTag(tag)}
              disabled={isSaving}
              className="ml-1 rounded-full hover:bg-muted p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}

        {tags.length < maxTags && (
          <>
            {isAddingTag ? (
              <div className="flex items-center gap-1">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddTag(newTag);
                    }
                  }}
                  onBlur={() => {
                    if (!newTag) {
                      setIsAddingTag(false);
                    }
                  }}
                  placeholder="Add tag..."
                  className="h-7 w-24 text-sm"
                  autoFocus
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleAddTag(newTag)}
                  disabled={!newTag.trim()}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setIsAddingTag(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Tag
                  </Button>
                </PopoverTrigger>
                {suggestedTags.length > 0 && (
                  <PopoverContent className="w-64 p-2">
                    <Command>
                      <CommandInput placeholder="Search tags..." />
                      <CommandList>
                        <CommandEmpty>No tags found.</CommandEmpty>
                        <CommandGroup heading="Suggested Tags">
                          {suggestedTags.map((tagData) => (
                            <CommandItem
                              key={tagData.tag}
                              onSelect={() => {
                                handleAddTag(tagData.tag);
                                setOpen(false);
                              }}
                            >
                              <span className="flex-1">{tagData.tag}</span>
                              <span className="text-xs text-muted-foreground">
                                {tagData.count}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                )}
              </Popover>
            )}
          </>
        )}
      </div>

      {isSaving && (
        <p className="text-xs text-muted-foreground">Saving tags...</p>
      )}
    </div>
  );
}