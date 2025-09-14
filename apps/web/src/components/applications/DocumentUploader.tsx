'use client';

// Import React hooks
import { useState, useRef, useCallback } from 'react';

// Import UI components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Upload,
  File,
  FileText,
  Image,
  Paperclip,
  Download,
  Trash,
  MoreVertical,
  X,
  CheckCircle,
  AlertCircle,
  Eye,
} from 'lucide-react';

// Import date utilities
import { format } from 'date-fns';

// Define interfaces for type safety
interface ApplicationDocument {
  id: string;
  fileName: string;
  originalName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  documentType: string;
  title: string | null;
  description: string | null;
  uploadedAt: Date;
}

interface DocumentUploaderProps {
  applicationId: string;
  documents: ApplicationDocument[];
  onDocumentsUpdate: () => void;
  maxFileSize?: number; // in bytes
  allowedFileTypes?: string[];
}

// Document type options
const DOCUMENT_TYPES = [
  { value: 'RESUME', label: 'Resume', icon: FileText },
  { value: 'COVER_LETTER', label: 'Cover Letter', icon: FileText },
  { value: 'PORTFOLIO', label: 'Portfolio', icon: File },
  { value: 'TRANSCRIPT', label: 'Transcript', icon: File },
  { value: 'CERTIFICATE', label: 'Certificate', icon: File },
  { value: 'REFERENCE', label: 'Reference Letter', icon: FileText },
  { value: 'OTHER', label: 'Other', icon: File },
];

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper function to get file icon based on MIME type
const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) {
    return <Image className=\"h-4 w-4\" />;
  } else if (mimeType.includes('pdf')) {
    return <File className=\"h-4 w-4 text-red-500\" />;
  } else if (mimeType.includes('word') || mimeType.includes('document')) {
    return <FileText className=\"h-4 w-4 text-blue-500\" />;
  } else {
    return <File className=\"h-4 w-4\" />;
  }
};

// DocumentUploader component
export function DocumentUploader({
  applicationId,
  documents,
  onDocumentsUpdate,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  allowedFileTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/jpeg', 'image/png', 'image/gif'],
}: DocumentUploaderProps) {
  // State for upload dialog
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isUploading, setIsUploading] = useState(false);
  
  // State for document metadata
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [documentType, setDocumentType] = useState('OTHER');
  
  // File input reference
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Validate files
    const validFiles = files.filter(file => {
      // Check file size
      if (file.size > maxFileSize) {
        alert(`File ${file.name} is too large. Maximum size is ${formatFileSize(maxFileSize)}.`);
        return false;
      }
      
      // Check file type
      if (!allowedFileTypes.includes(file.type)) {
        alert(`File ${file.name} has an unsupported file type.`);
        return false;
      }
      
      return true;
    });
    
    setSelectedFiles(validFiles);
    
    // Auto-set title if only one file selected
    if (validFiles.length === 1) {
      setTitle(validFiles[0].name.split('.').slice(0, -1).join('.'));
    } else {
      setTitle('');
    }
  }, [maxFileSize, allowedFileTypes]);

  // Handle drag and drop
  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    
    const files = Array.from(event.dataTransfer.files);
    
    // Create a mock file input event
    const mockEvent = {
      target: { files } as any,
    } as React.ChangeEvent<HTMLInputElement>;
    
    handleFileSelect(mockEvent);
  }, [handleFileSelect]);

  // Handle drag over
  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  // Handle file upload
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    setIsUploading(true);
    
    try {
      // Upload files one by one
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title || file.name.split('.').slice(0, -1).join('.'));
        formData.append('description', description);
        formData.append('documentType', documentType);
        
        // Create XMLHttpRequest for progress tracking
        const xhr = new XMLHttpRequest();
        
        // Track upload progress
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
          }
        };
        
        // Wait for upload to complete
        await new Promise((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status === 200 || xhr.status === 201) {
              resolve(xhr.response);
            } else {
              reject(new Error(`Upload failed: ${xhr.statusText}`));
            }
          };
          
          xhr.onerror = () => reject(new Error('Upload failed'));
          
          xhr.open('POST', `/api/applications/${applicationId}/documents`);
          xhr.send(formData);
        });
      }
      
      // Reset form and close dialog
      setSelectedFiles([]);
      setTitle('');
      setDescription('');
      setDocumentType('OTHER');
      setUploadProgress({});
      setIsUploadOpen(false);
      
      // Refresh documents list
      onDocumentsUpdate();
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Failed to upload files. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle document deletion
  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/applications/${applicationId}/documents/${documentId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete document');
      }
      
      // Refresh documents list
      onDocumentsUpdate();
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document. Please try again.');
    }
  };

  // Handle document download
  const handleDownloadDocument = (document: ApplicationDocument) => {
    // Create a temporary link and trigger download
    const link = window.document.createElement('a');
    link.href = document.fileUrl;
    link.download = document.originalName;
    link.click();
  };

  return (
    <Card className=\"h-full flex flex-col\">
      <CardHeader className=\"flex-shrink-0\">
        <div className=\"flex items-center justify-between\">
          <CardTitle className=\"text-lg flex items-center\">
            <Paperclip className=\"h-5 w-5 mr-2\" />
            Documents
            <Badge variant=\"secondary\" className=\"ml-2\">
              {documents.length}
            </Badge>
          </CardTitle>
          
          {/* Upload Button */}
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button size=\"sm\">
                <Upload className=\"h-4 w-4 mr-2\" />
                Upload
              </Button>
            </DialogTrigger>
            <DialogContent className=\"max-w-md\">
              <DialogHeader>
                <DialogTitle>Upload Documents</DialogTitle>
                <DialogDescription>
                  Upload files related to this application (resumes, cover letters, etc.)
                </DialogDescription>
              </DialogHeader>
              
              <div className=\"space-y-4\">
                {/* File Upload Area */}
                <div
                  className=\"border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer\"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type=\"file\"
                    multiple
                    accept={allowedFileTypes.join(',')}
                    onChange={handleFileSelect}
                    className=\"hidden\"
                  />
                  
                  <Upload className=\"h-8 w-8 mx-auto text-gray-400 mb-2\" />
                  <p className=\"text-sm text-gray-600 mb-1\">
                    Drag & drop files here, or click to select
                  </p>
                  <p className=\"text-xs text-gray-500\">
                    Max size: {formatFileSize(maxFileSize)} | Supported: PDF, DOC, DOCX, TXT, JPG, PNG, GIF
                  </p>
                </div>
                
                {/* Selected Files */}
                {selectedFiles.length > 0 && (
                  <div className=\"space-y-2\">
                    <h4 className=\"text-sm font-medium\">Selected Files:</h4>
                    {selectedFiles.map((file, index) => (
                      <div key={index} className=\"flex items-center justify-between p-2 bg-muted rounded\">
                        <div className=\"flex items-center space-x-2 min-w-0 flex-1\">
                          {getFileIcon(file.type)}
                          <span className=\"text-sm truncate\">{file.name}</span>
                          <Badge variant=\"outline\" className=\"text-xs\">
                            {formatFileSize(file.size)}
                          </Badge>
                        </div>
                        
                        <Button
                          variant=\"ghost\"
                          size=\"sm\"
                          className=\"h-6 w-6 p-0\"
                          onClick={() => {
                            setSelectedFiles(files => files.filter((_, i) => i !== index));
                          }}
                        >
                          <X className=\"h-3 w-3\" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Upload Progress */}
                {isUploading && (
                  <div className=\"space-y-2\">
                    <h4 className=\"text-sm font-medium\">Upload Progress:</h4>
                    {selectedFiles.map(file => (
                      <div key={file.name} className=\"space-y-1\">
                        <div className=\"flex items-center justify-between text-sm\">
                          <span className=\"truncate\">{file.name}</span>
                          <span>{uploadProgress[file.name] || 0}%</span>
                        </div>
                        <Progress value={uploadProgress[file.name] || 0} className=\"h-1\" />
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Document Metadata */}
                {selectedFiles.length > 0 && !isUploading && (
                  <div className=\"space-y-3\">
                    <div className=\"space-y-2\">
                      <label className=\"text-sm font-medium\">Title</label>
                      <Input
                        placeholder=\"Document title...\"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>
                    
                    <div className=\"space-y-2\">
                      <label className=\"text-sm font-medium\">Description (optional)</label>
                      <Textarea
                        placeholder=\"Brief description of the document...\"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={2}
                      />
                    </div>
                    
                    <div className=\"space-y-2\">
                      <label className=\"text-sm font-medium\">Document Type</label>
                      <Select value={documentType} onValueChange={setDocumentType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DOCUMENT_TYPES.map((type) => {
                            const IconComponent = type.icon;
                            return (
                              <SelectItem key={type.value} value={type.value}>
                                <div className=\"flex items-center\">
                                  <IconComponent className=\"h-4 w-4 mr-2\" />
                                  {type.label}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button
                  variant=\"outline\"
                  onClick={() => {
                    setIsUploadOpen(false);
                    setSelectedFiles([]);
                    setTitle('');
                    setDescription('');
                    setDocumentType('OTHER');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={selectedFiles.length === 0 || isUploading}
                >
                  {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''}`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className=\"flex-1 min-h-0\">
        {documents.length > 0 ? (
          <div className=\"space-y-3\">
            {documents.map((document) => {
              const documentTypeConfig = DOCUMENT_TYPES.find(t => t.value === document.documentType);
              const IconComponent = documentTypeConfig?.icon || File;
              
              return (
                <Card key={document.id} className=\"p-3\">
                  <div className=\"flex items-start justify-between\">
                    <div className=\"flex items-start space-x-3 flex-1 min-w-0\">
                      {/* Document Icon */}
                      <div className=\"flex-shrink-0 mt-1\">
                        <IconComponent className=\"h-4 w-4 text-muted-foreground\" />
                      </div>
                      
                      {/* Document Info */}
                      <div className=\"min-w-0 flex-1\">
                        <h4 className=\"font-medium text-sm line-clamp-1\">
                          {document.title || document.originalName}
                        </h4>
                        
                        {document.description && (
                          <p className=\"text-xs text-muted-foreground mt-1 line-clamp-2\">
                            {document.description}
                          </p>
                        )}
                        
                        <div className=\"flex items-center space-x-2 mt-2\">
                          <Badge variant=\"outline\" className=\"text-xs\">
                            {documentTypeConfig?.label || 'Other'}
                          </Badge>
                          <span className=\"text-xs text-muted-foreground\">
                            {formatFileSize(document.fileSize)}
                          </span>
                          <span className=\"text-xs text-muted-foreground\">
                            {format(new Date(document.uploadedAt), 'MMM dd, yyyy')}
                          </span>
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
                        <DropdownMenuItem onClick={() => window.open(document.fileUrl, '_blank')}>
                          <Eye className=\"h-4 w-4 mr-2\" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadDocument(document)}>
                          <Download className=\"h-4 w-4 mr-2\" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteDocument(document.id)}
                          className=\"text-red-600\"
                        >
                          <Trash className=\"h-4 w-4 mr-2\" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className=\"text-center py-12\">
            <Paperclip className=\"h-12 w-12 mx-auto text-muted-foreground mb-4\" />
            <h3 className=\"font-medium text-lg mb-2\">No documents yet</h3>
            <p className=\"text-muted-foreground mb-4\">
              Upload documents related to this application like resumes, cover letters, or portfolios.
            </p>
            <Button onClick={() => setIsUploadOpen(true)}>
              <Upload className=\"h-4 w-4 mr-2\" />
              Upload First Document
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}