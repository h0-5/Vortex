import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@vortex/ui';
import type { GuildPluginListResponse } from '@vortex/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UploadIcon, XIcon } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { api } from '../lib/api-client.js';

interface PluginUploadDialogProps {
  guildId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ALLOWED_EXTENSIONS = new Set(['vortex', 'codenexus']);
const MAX_SIZE_MB = 50;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export function PluginUploadDialog({ guildId, open, onOpenChange }: PluginUploadDialogProps) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const upload = useMutation({
    mutationFn: (selectedFile: File) => api.uploadGuildPlugin(guildId, selectedFile),
    onSuccess: async (plugin) => {
      queryClient.setQueryData<GuildPluginListResponse>(['guilds', guildId, 'plugins'], (current) => {
        if (!current) return { data: [plugin] };
        const exists = current.data.some((item) => item.id === plugin.id);
        return { data: exists ? current.data.map((item) => (item.id === plugin.id ? plugin : item)) : [...current.data, plugin] };
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['guilds', guildId, 'plugins'] }),
        queryClient.invalidateQueries({ queryKey: ['guilds', guildId] }),
        queryClient.invalidateQueries({ queryKey: ['guilds'] }),
      ]);
      toast.success('Plugin installed successfully.');
      setFile(null);
      setValidationError(null);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload plugin.');
    },
  });

  const validateFile = useCallback((selectedFile: File): string | null => {
    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!extension || !ALLOWED_EXTENSIONS.has(extension)) {
      return 'Only .vortex and .codenexus files are allowed.';
    }
    if (selectedFile.size > MAX_SIZE_BYTES) {
      return `File exceeds the ${MAX_SIZE_MB} MB limit.`;
    }
    return null;
  }, []);

  const handleFile = useCallback(
    (selectedFile: File | null | undefined) => {
      upload.reset();
      if (!selectedFile) {
        setFile(null);
        setValidationError(null);
        return;
      }
      const error = validateFile(selectedFile);
      if (error) {
        setValidationError(error);
        setFile(null);
        return;
      }
      setValidationError(null);
      setFile(selectedFile);
    },
    [validateFile, upload],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragActive(false);
      handleFile(event.dataTransfer.files[0]);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
  }, []);

  const handleClose = useCallback(() => {
    setFile(null);
    setValidationError(null);
    upload.reset();
    onOpenChange(false);
  }, [onOpenChange, upload]);

  const errorMessage = validationError ?? upload.error?.message ?? null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload plugin</DialogTitle>
          <DialogDescription>
            Install a Vortex plugin package. The plugin will be disabled by default.
          </DialogDescription>
        </DialogHeader>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={[
            'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors',
            dragActive ? 'border-primary bg-primary/5' : 'border-border bg-muted/30',
          ].join(' ')}
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <UploadIcon className="size-5" />
          </span>
          <div className="text-center">
            <p className="text-sm font-medium">
              {file ? file.name : 'Drag and drop a plugin package'}
            </p>
            <p className="text-xs text-muted-foreground">
              {file
                ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
                : '.vortex or .codenexus up to 50 MB'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => document.getElementById('plugin-upload-input')?.click()}
            >
              Browse files
            </Button>
            {file ? (
              <Button size="sm" variant="ghost" onClick={() => { setFile(null); setValidationError(null); }}>
                <XIcon className="size-4" />
              </Button>
            ) : null}
          </div>
          <input
            id="plugin-upload-input"
            type="file"
            accept=".vortex,.codenexus"
            className="hidden"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
        </div>

        {errorMessage ? (
          <p className="text-sm text-destructive" role="alert">{errorMessage}</p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={upload.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => file && upload.mutate(file)}
            disabled={!file || upload.isPending}
          >
            {upload.isPending ? 'Installing...' : 'Install plugin'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
