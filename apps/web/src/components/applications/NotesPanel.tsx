'use client';

// Import React hooks
import { useState, useEffect } from 'react';

// Import UI components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Import icons
import {
  Plus,
  Edit,
  Trash,
  Pin,
  PinOff,
  MoreVertical,
  FileText,
  Clock,
  Palette,
} from 'lucide-react';

// Import date utilities
import { formatDistanceToNow, format } from 'date-fns';

// Define interfaces for type safety
interface ApplicationNote {
  id: string;
  title: string | null;
  content: string;
  isPrivate: boolean;
  isPinned: boolean;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    name: string | null;
    image: string | null;
  };
}

interface NotesPanelProps {
  applicationId: string;
  notes: ApplicationNote[];
  onNotesUpdate: () => void;
  isLoading?: boolean;
}

// Color options for notes
const NOTE_COLORS = [
  { name: 'Default', value: null, class: 'bg-white' },
  { name: 'Yellow', value: '#FEF3C7', class: 'bg-yellow-100' },
  { name: 'Blue', value: '#DBEAFE', class: 'bg-blue-100' },
  { name: 'Green', value: '#D1FAE5', class: 'bg-green-100' },
  { name: 'Purple', value: '#E9D5FF', class: 'bg-purple-100' },
  { name: 'Pink', value: '#FCE7F3', class: 'bg-pink-100' },
  { name: 'Orange', value: '#FED7AA', class: 'bg-orange-100' },
];

// NotesPanel component
export function NotesPanel({ applicationId, notes, onNotesUpdate, isLoading = false }: NotesPanelProps) {
  // State for creating/editing notes
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<ApplicationNote | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [isPinned, setIsPinned] = useState(false);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isCreateOpen && !editingNote) {
      setTitle('');
      setContent('');
      setSelectedColor(null);
      setIsPinned(false);
    }
  }, [isCreateOpen, editingNote]);

  // Load existing note data when editing
  useEffect(() => {
    if (editingNote) {
      setTitle(editingNote.title || '');
      setContent(editingNote.content);
      setSelectedColor(editingNote.color);
      setIsPinned(editingNote.isPinned);
    }
  }, [editingNote]);

  // Handle create note
  const handleCreateNote = async () => {
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/applications/${applicationId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim() || null,
          content: content.trim(),
          color: selectedColor,
          isPinned,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create note');
      }

      // Reset form and close dialog
      setTitle('');
      setContent('');
      setSelectedColor(null);
      setIsPinned(false);
      setIsCreateOpen(false);
      
      // Refresh notes list
      onNotesUpdate();
    } catch (error) {
      console.error('Error creating note:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update note
  const handleUpdateNote = async () => {
    if (!editingNote || !content.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/applications/${applicationId}/notes/${editingNote.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim() || null,
          content: content.trim(),
          color: selectedColor,
          isPinned,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update note');
      }

      // Reset form and close dialog
      setEditingNote(null);
      
      // Refresh notes list
      onNotesUpdate();
    } catch (error) {
      console.error('Error updating note:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete note
  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      const response = await fetch(`/api/applications/${applicationId}/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete note');
      }

      // Refresh notes list
      onNotesUpdate();
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  // Handle toggle pin
  const handleTogglePin = async (note: ApplicationNote) => {
    try {
      const response = await fetch(`/api/applications/${applicationId}/notes/${note.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isPinned: !note.isPinned,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update note');
      }

      // Refresh notes list
      onNotesUpdate();
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  // Sort notes by pinned status and date
  const sortedNotes = [...notes].sort((a, b) => {
    // Pinned notes first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    
    // Then by updated date (most recent first)
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <Card className=\"h-full flex flex-col\">
      <CardHeader className=\"flex-shrink-0\">
        <div className=\"flex items-center justify-between\">
          <CardTitle className=\"text-lg flex items-center\">
            <FileText className=\"h-5 w-5 mr-2\" />
            Notes
            <Badge variant=\"secondary\" className=\"ml-2\">
              {notes.length}
            </Badge>
          </CardTitle>
          
          {/* Create Note Button */}
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size=\"sm\">
                <Plus className=\"h-4 w-4 mr-2\" />
                Add Note
              </Button>
            </DialogTrigger>
            <DialogContent className=\"max-w-md\">
              <DialogHeader>
                <DialogTitle>Create New Note</DialogTitle>
                <DialogDescription>
                  Add a note to track important details about this application.
                </DialogDescription>
              </DialogHeader>
              
              <div className=\"space-y-4\">
                {/* Title Input */}
                <div className=\"space-y-2\">
                  <label className=\"text-sm font-medium\">Title (optional)</label>
                  <Input
                    placeholder=\"Enter note title...\"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                
                {/* Content Textarea */}
                <div className=\"space-y-2\">
                  <label className=\"text-sm font-medium\">Content</label>
                  <Textarea
                    placeholder=\"Enter note content...\"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={4}
                  />
                </div>
                
                {/* Color Picker */}
                <div className=\"space-y-2\">
                  <label className=\"text-sm font-medium\">Color</label>
                  <div className=\"flex space-x-2\">
                    {NOTE_COLORS.map((color) => (
                      <button
                        key={color.name}
                        type=\"button\"
                        className={`w-6 h-6 rounded border-2 ${
                          selectedColor === color.value
                            ? 'border-blue-500'
                            : 'border-gray-300'
                        } ${color.class}`}
                        onClick={() => setSelectedColor(color.value)}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
                
                {/* Pin Option */}
                <div className=\"flex items-center space-x-2\">
                  <input
                    type=\"checkbox\"
                    id=\"pin-note\"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className=\"rounded\"
                  />
                  <label htmlFor=\"pin-note\" className=\"text-sm font-medium\">
                    Pin this note
                  </label>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant=\"outline\" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateNote} disabled={!content.trim() || isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Note'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className=\"flex-1 min-h-0\">
        <ScrollArea className=\"h-full\">
          {isLoading ? (
            <div className=\"space-y-4\">
              {[1, 2, 3].map((i) => (
                <div key={i} className=\"p-4 bg-muted rounded-lg animate-pulse\">
                  <div className=\"h-4 bg-gray-300 rounded w-3/4 mb-2\" />
                  <div className=\"h-3 bg-gray-300 rounded w-full mb-1\" />
                  <div className=\"h-3 bg-gray-300 rounded w-2/3\" />
                </div>
              ))}
            </div>
          ) : sortedNotes.length > 0 ? (
            <div className=\"space-y-4\">
              {sortedNotes.map((note) => (
                <Card
                  key={note.id}
                  className=\"relative\"
                  style={{
                    backgroundColor: note.color || 'white',
                  }}
                >
                  {/* Pinned Indicator */}
                  {note.isPinned && (
                    <div className=\"absolute top-2 left-2\">
                      <Pin className=\"h-3 w-3 text-blue-500\" />
                    </div>
                  )}
                  
                  <CardContent className=\"pt-4 pb-3\">
                    <div className=\"flex items-start justify-between\">
                      <div className=\"flex-1 min-w-0 pr-2\">
                        {/* Note Title */}
                        {note.title && (
                          <h4 className=\"font-medium text-sm mb-2 line-clamp-2\">
                            {note.title}
                          </h4>
                        )}
                        
                        {/* Note Content */}
                        <p className=\"text-sm text-muted-foreground mb-3 whitespace-pre-wrap\">
                          {note.content}
                        </p>
                        
                        {/* Note Metadata */}
                        <div className=\"flex items-center justify-between text-xs text-muted-foreground\">
                          <div className=\"flex items-center space-x-2\">
                            <Avatar className=\"h-4 w-4\">
                              <AvatarImage src={note.user.image || ''} />
                              <AvatarFallback className=\"text-xs\">
                                {note.user.name?.[0] || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <span>{note.user.name || 'Anonymous'}</span>
                          </div>
                          
                          <div className=\"flex items-center space-x-1\">
                            <Clock className=\"h-3 w-3\" />
                            <span>{formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}</span>
                            {new Date(note.updatedAt) > new Date(note.createdAt) && (
                              <span className=\"text-blue-600\">(edited)</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Actions Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant=\"ghost\" size=\"sm\" className=\"h-6 w-6 p-0\">
                            <MoreVertical className=\"h-4 w-4\" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align=\"end\">
                          <DropdownMenuItem onClick={() => setEditingNote(note)}>
                            <Edit className=\"h-4 w-4 mr-2\" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleTogglePin(note)}>
                            {note.isPinned ? (
                              <>
                                <PinOff className=\"h-4 w-4 mr-2\" />
                                Unpin
                              </>
                            ) : (
                              <>
                                <Pin className=\"h-4 w-4 mr-2\" />
                                Pin
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteNote(note.id)}
                            className=\"text-red-600\"
                          >
                            <Trash className=\"h-4 w-4 mr-2\" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className=\"text-center py-12\">
              <FileText className=\"h-12 w-12 mx-auto text-muted-foreground mb-4\" />
              <h3 className=\"font-medium text-lg mb-2\">No notes yet</h3>
              <p className=\"text-muted-foreground mb-4\">
                Add notes to track important details about this application.
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className=\"h-4 w-4 mr-2\" />
                Add Your First Note
              </Button>
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {/* Edit Note Dialog */}
      <Dialog open={!!editingNote} onOpenChange={(open) => !open && setEditingNote(null)}>
        <DialogContent className=\"max-w-md\">
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
            <DialogDescription>
              Update your note details below.
            </DialogDescription>
          </DialogHeader>
          
          <div className=\"space-y-4\">
            {/* Title Input */}
            <div className=\"space-y-2\">
              <label className=\"text-sm font-medium\">Title (optional)</label>
              <Input
                placeholder=\"Enter note title...\"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            
            {/* Content Textarea */}
            <div className=\"space-y-2\">
              <label className=\"text-sm font-medium\">Content</label>
              <Textarea
                placeholder=\"Enter note content...\"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
              />
            </div>
            
            {/* Color Picker */}
            <div className=\"space-y-2\">
              <label className=\"text-sm font-medium\">Color</label>
              <div className=\"flex space-x-2\">
                {NOTE_COLORS.map((color) => (
                  <button
                    key={color.name}
                    type=\"button\"
                    className={`w-6 h-6 rounded border-2 ${
                      selectedColor === color.value
                        ? 'border-blue-500'
                        : 'border-gray-300'
                    } ${color.class}`}
                    onClick={() => setSelectedColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
            
            {/* Pin Option */}
            <div className=\"flex items-center space-x-2\">
              <input
                type=\"checkbox\"
                id=\"edit-pin-note\"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className=\"rounded\"
              />
              <label htmlFor=\"edit-pin-note\" className=\"text-sm font-medium\">
                Pin this note
              </label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant=\"outline\" onClick={() => setEditingNote(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateNote} disabled={!content.trim() || isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}