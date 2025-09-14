'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  Link2,
  Mail,
  Code,
  Copy,
  Calendar,
  Lock,
  Download,
  Eye,
  Shield,
  Check,
} from 'lucide-react';

interface ShareSettings {
  shareType: 'LINK' | 'EMAIL' | 'EMBED';
  expiresAt?: Date;
  password?: string;
  allowDownload: boolean;
  allowCopy: boolean;
  requireEmail: boolean;
}

interface ResumeSharingProps {
  resumeId: string;
  resumeTitle: string;
  onShare: (settings: ShareSettings) => Promise<{ shareUrl: string; shareToken: string }>;
}

export function ResumeSharing({ resumeId, resumeTitle, onShare }: ResumeSharingProps) {
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  
  const [settings, setSettings] = useState<ShareSettings>({
    shareType: 'LINK',
    allowDownload: false,
    allowCopy: false,
    requireEmail: false,
  });

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const result = await onShare(settings);
      setShareUrl(result.shareUrl);
      toast({
        title: 'Share link created',
        description: 'Your resume share link has been generated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error creating share link',
        description: 'Failed to generate share link. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Link copied',
      description: 'Share link copied to clipboard.',
    });
  };

  const getShareTypeIcon = () => {
    switch (settings.shareType) {
      case 'LINK':
        return <Link2 className="h-4 w-4" />;
      case 'EMAIL':
        return <Mail className="h-4 w-4" />;
      case 'EMBED':
        return <Code className="h-4 w-4" />;
    }
  };

  return (
    <>
      <Button onClick={() => setShowShareDialog(true)}>
        <Link2 className="h-4 w-4 mr-2" />
        Share Resume
      </Button>

      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Share Resume</DialogTitle>
            <DialogDescription>
              Create a secure link to share "{resumeTitle}" with others
            </DialogDescription>
          </DialogHeader>

          <Tabs value={settings.shareType} onValueChange={(v) => setSettings({ ...settings, shareType: v as any })}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="LINK">
                <Link2 className="h-4 w-4 mr-2" />
                Link
              </TabsTrigger>
              <TabsTrigger value="EMAIL">
                <Mail className="h-4 w-4 mr-2" />
                Email
              </TabsTrigger>
              <TabsTrigger value="EMBED">
                <Code className="h-4 w-4 mr-2" />
                Embed
              </TabsTrigger>
            </TabsList>

            <TabsContent value="LINK" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generate a direct link to share your resume. You can control access permissions and set an expiration date.
              </p>
            </TabsContent>

            <TabsContent value="EMAIL" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Create a trackable link for email sharing. You'll see when the recipient views your resume.
              </p>
            </TabsContent>

            <TabsContent value="EMBED" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generate an embed code to display your resume on websites or portfolios.
              </p>
            </TabsContent>
          </Tabs>

          <div className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="expiration">Expiration Date</Label>
                  <p className="text-xs text-muted-foreground">
                    Link will expire after this date
                  </p>
                </div>
                <Input
                  id="expiration"
                  type="date"
                  className="w-auto"
                  min={format(new Date(), 'yyyy-MM-dd')}
                  onChange={(e) => setSettings({
                    ...settings,
                    expiresAt: e.target.value ? new Date(e.target.value) : undefined
                  })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="password">Password Protection</Label>
                  <p className="text-xs text-muted-foreground">
                    Require a password to view
                  </p>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Optional password"
                  className="w-48"
                  value={settings.password || ''}
                  onChange={(e) => setSettings({ ...settings, password: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium">Permissions</h4>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="allow-download" className="font-normal">
                    Allow Download
                  </Label>
                </div>
                <Switch
                  id="allow-download"
                  checked={settings.allowDownload}
                  onCheckedChange={(checked) => setSettings({ ...settings, allowDownload: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Copy className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="allow-copy" className="font-normal">
                    Allow Copy Text
                  </Label>
                </div>
                <Switch
                  id="allow-copy"
                  checked={settings.allowCopy}
                  onCheckedChange={(checked) => setSettings({ ...settings, allowCopy: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="require-email" className="font-normal">
                    Require Email to View
                  </Label>
                </div>
                <Switch
                  id="require-email"
                  checked={settings.requireEmail}
                  onCheckedChange={(checked) => setSettings({ ...settings, requireEmail: checked })}
                />
              </div>
            </div>

            {shareUrl && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Share Link Generated</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Input
                      value={shareUrl}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyLink}
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  {settings.password && (
                    <p className="text-xs text-muted-foreground mt-2">
                      <Lock className="h-3 w-3 inline mr-1" />
                      Password protected: {settings.password}
                    </p>
                  )}
                  
                  {settings.expiresAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      Expires: {format(settings.expiresAt, 'MMM dd, yyyy')}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareDialog(false)}>
              Close
            </Button>
            {!shareUrl && (
              <Button onClick={handleShare} disabled={isSharing}>
                {getShareTypeIcon()}
                <span className="ml-2">
                  {isSharing ? 'Creating...' : 'Create Share Link'}
                </span>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}