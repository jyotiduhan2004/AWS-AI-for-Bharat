'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';

interface VideoUploaderProps {
  creatorId: string;
  onComplete: () => void;
}

interface FileItem {
  file: File;
  name: string;
  size: string;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

const MAX_FILES = 5;
const MIN_FILES = 1;
const MAX_SIZE_MB = 100;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime'];

const DEMO_VIDEOS = [
  { url: '/demo-videos/claude-bot-setup.mp4', name: 'claude-bot-setup.mp4' },
  { url: '/demo-videos/india-ai-summit.mp4', name: 'india-ai-summit.mp4' },
  { url: '/demo-videos/tcs-nqt-career.mp4', name: 'tcs-nqt-career.mp4' },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function VideoUploader({
  creatorId,
  onComplete,
}: VideoUploaderProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Ref to always access latest files (avoids stale closure in upload loop)
  const filesRef = useRef<FileItem[]>(files);
  useEffect(() => { filesRef.current = files; }, [files]);

  const validateFiles = useCallback(
    (newFiles: File[]): { valid: File[]; errors: string[] } => {
      const errors: string[] = [];
      const valid: File[] = [];

      const totalCount = files.length + newFiles.length;
      if (totalCount > MAX_FILES) {
        errors.push(`Maximum ${MAX_FILES} files allowed. You already have ${files.length}.`);
        return { valid, errors };
      }

      for (const file of newFiles) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          errors.push(`"${file.name}" is not MP4 or MOV format.`);
          continue;
        }
        if (file.size > MAX_SIZE_BYTES) {
          errors.push(`"${file.name}" exceeds ${MAX_SIZE_MB}MB limit.`);
          continue;
        }
        if (files.some((f) => f.name === file.name)) {
          errors.push(`"${file.name}" is already added.`);
          continue;
        }
        valid.push(file);
      }

      return { valid, errors };
    },
    [files]
  );

  const addFiles = useCallback(
    (newFiles: File[]) => {
      const { valid, errors } = validateFiles(newFiles);
      if (errors.length > 0) {
        setError(errors.join(' '));
      } else {
        setError(null);
      }

      const items: FileItem[] = valid.map((f) => ({
        file: f,
        name: f.name,
        size: formatFileSize(f.size),
        progress: 0,
        status: 'pending' as const,
      }));

      setFiles((prev) => [...prev, ...items]);
    },
    [validateFiles]
  );

  const loadDemoVideos = async () => {
    setIsLoadingDemo(true);
    setError(null);
    try {
      const demoFiles = await Promise.all(
        DEMO_VIDEOS.map(async (demo) => {
          const response = await fetch(demo.url);
          if (!response.ok) throw new Error(`Failed to fetch ${demo.name}`);
          const blob = await response.blob();
          return new File([blob], demo.name, { type: 'video/mp4' });
        })
      );
      addFiles(demoFiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load demo videos');
    } finally {
      setIsLoadingDemo(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    addFiles(dropped);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
    setError(null);
  };

  const uploadFile = async (
    fileItem: FileItem,
    index: number
  ): Promise<boolean> => {
    try {
      setFiles((prev) =>
        prev.map((f, i) => (i === index ? { ...f, status: 'uploading' } : f))
      );

      const contentType = fileItem.file.type === 'video/quicktime'
        ? 'video/quicktime'
        : 'video/mp4';

      const { url } = await api.getPresignedUrl({
        creator_id: creatorId,
        filename: fileItem.name,
        content_type: contentType,
      });

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 100);
            setFiles((prev) =>
              prev.map((f, i) => (i === index ? { ...f, progress: pct } : f))
            );
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setFiles((prev) =>
              prev.map((f, i) =>
                i === index ? { ...f, status: 'done', progress: 100 } : f
              )
            );
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        xhr.open('PUT', url);
        xhr.setRequestHeader('Content-Type', contentType);
        xhr.send(fileItem.file);
      });

      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Upload failed';
      setFiles((prev) =>
        prev.map((f, i) =>
          i === index ? { ...f, status: 'error', error: message } : f
        )
      );
      return false;
    }
  };

  const handleUpload = async () => {
    const currentFiles = filesRef.current;
    if (currentFiles.length < MIN_FILES) {
      setError(`Please add at least ${MIN_FILES} files.`);
      return;
    }

    setIsUploading(true);
    setError(null);

    let allSuccess = true;
    for (let i = 0; i < currentFiles.length; i++) {
      // Read latest status from ref to avoid stale closure
      const latestFiles = filesRef.current;
      if (latestFiles[i]?.status === 'done') continue;
      const success = await uploadFile(latestFiles[i], i);
      if (!success) allSuccess = false;
    }

    setIsUploading(false);

    if (allSuccess) {
      onComplete();
    } else {
      setError('Some files failed to upload. You can retry the failed ones.');
    }
  };

  const pendingCount = files.filter((f) => f.status !== 'done').length;
  const canUpload = files.length >= MIN_FILES && pendingCount > 0;

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          isDragging
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
        } ${files.length >= MAX_FILES ? 'pointer-events-none opacity-50' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/quicktime,.mp4,.mov"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary-50">
          <svg
            className="h-7 w-7 text-primary-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-700">
          Drag and drop your videos here, or{' '}
          <span className="text-primary-600">browse</span>
        </p>
        <p className="mt-1 text-xs text-gray-400">
          MP4 or MOV, max {MAX_SIZE_MB}MB per file, {MIN_FILES}-{MAX_FILES} files
        </p>
      </div>

      {/* Demo Videos */}
      {files.length === 0 && (
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-400">or</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>
      )}
      {files.length === 0 && (
        <button
          onClick={loadDemoVideos}
          disabled={isLoadingDemo}
          className="btn-secondary w-full"
        >
          {isLoadingDemo ? (
            <span className="flex items-center justify-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400/30 border-t-gray-600" />
              Loading demo videos...
            </span>
          ) : (
            <>
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
                />
              </svg>
              Load 3 Demo Videos
            </>
          )}
        </button>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              {files.length} file{files.length !== 1 ? 's' : ''} selected
            </p>
            <p className="text-xs text-gray-400">
              {MIN_FILES}-{MAX_FILES} required
            </p>
          </div>

          {files.map((fileItem, idx) => (
            <div
              key={fileItem.name}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                <svg
                  className="h-5 w-5 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-2.625 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 12 6 12.504 6 13.125M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {fileItem.name}
                  </p>
                  <div className="ml-2 flex items-center gap-2">
                    <span className="shrink-0 text-xs text-gray-400">
                      {fileItem.size}
                    </span>
                    {fileItem.status === 'done' && (
                      <svg
                        className="h-4 w-4 text-green-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    )}
                    {fileItem.status === 'error' && (
                      <svg
                        className="h-4 w-4 text-red-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                        />
                      </svg>
                    )}
                    {!isUploading && fileItem.status !== 'done' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(fileItem.name);
                        }}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                {(fileItem.status === 'uploading' || fileItem.status === 'done') && (
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        fileItem.status === 'done'
                          ? 'bg-green-500'
                          : 'bg-primary-600'
                      }`}
                      style={{ width: `${fileItem.progress}%` }}
                    />
                  </div>
                )}
                {fileItem.error && (
                  <p className="mt-1 text-xs text-red-500">{fileItem.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={!canUpload || isUploading}
        className="btn-primary w-full"
      >
        {isUploading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Uploading...
          </span>
        ) : (
          <>
            Upload {files.length} Video{files.length !== 1 ? 's' : ''}
            <svg
              className="ml-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
          </>
        )}
      </button>
    </div>
  );
}
