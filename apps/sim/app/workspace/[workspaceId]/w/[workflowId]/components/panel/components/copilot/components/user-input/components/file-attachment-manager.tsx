"use client";

import { type ChangeEvent, type DragEvent, useRef, useState } from "react";
import { Paperclip, X } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui";
import { createLogger } from "@/lib/logs/console/logger";

const logger = createLogger("FileAttachmentManager");

export interface MessageFileAttachment {
  id: string;
  key: string;
  filename: string;
  media_type: string;
  size: number;
}

export interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  path: string;
  key?: string;
  uploading: boolean;
  previewUrl?: string;
}

interface FileAttachmentManagerProps {
  attachedFiles: AttachedFile[];
  onFilesChange: (files: AttachedFile[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  maxFileSize?: number;
  allowedTypes?: string[];
  className?: string;
}

export function FileAttachmentManager({
  attachedFiles,
  onFilesChange,
  disabled = false,
  maxFiles = 10,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  allowedTypes = ["image/*", "application/pdf", ".txt", ".csv", ".xlsx"],
  className = "",
}: FileAttachmentManagerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDragging(false);
      }
      return newCounter;
    });
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragCounter(0);

    const files = Array.from(e.dataTransfer.files);
    handleFileSelection(files);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFileSelection(files);
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelection = async (files: File[]) => {
    if (disabled || attachedFiles.length >= maxFiles) return;

    const validFiles = files
      .filter((file) => {
        if (file.size > maxFileSize) {
          logger.warn(`File ${file.name} is too large (${file.size} bytes)`);
          return false;
        }
        return true;
      })
      .slice(0, maxFiles - attachedFiles.length);

    const newAttachedFiles: AttachedFile[] = await Promise.all(
      validFiles.map(async (file) => {
        const id = Math.random().toString(36).substring(7);
        const previewUrl = file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined;

        return {
          id,
          name: file.name,
          size: file.size,
          type: file.type,
          path: file.name,
          uploading: true,
          previewUrl,
        };
      }),
    );

    onFilesChange([...attachedFiles, ...newAttachedFiles]);

    // Simulate upload process
    newAttachedFiles.forEach(async (attachedFile, index) => {
      try {
        // Here you would implement actual file upload logic
        await new Promise((resolve) => setTimeout(resolve, 1000 + index * 500));

        const updatedFile = {
          ...attachedFile,
          uploading: false,
          key: `uploaded_${attachedFile.id}`,
        };

        onFilesChange((prev) =>
          prev.map((f) => (f.id === attachedFile.id ? updatedFile : f)),
        );
      } catch (error) {
        logger.error("Failed to upload file:", attachedFile.name, error);
        onFilesChange((prev) => prev.filter((f) => f.id !== attachedFile.id));
      }
    });
  };

  const removeFile = (fileId: string) => {
    const fileToRemove = attachedFiles.find((f) => f.id === fileId);
    if (fileToRemove?.previewUrl) {
      URL.revokeObjectURL(fileToRemove.previewUrl);
    }
    onFilesChange(attachedFiles.filter((f) => f.id !== fileId));
  };

  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className={`file-attachment-manager ${className}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={allowedTypes.join(",")}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Drag and drop overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center border-2 border-blue-500 border-dashed bg-blue-500/10">
          <div className="rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
            <p className="font-medium text-lg">Drop files here to attach</p>
          </div>
        </div>
      )}

      {/* Attach button */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={openFileDialog}
        disabled={disabled || attachedFiles.length >= maxFiles}
        className="p-2"
      >
        <Paperclip className="h-4 w-4" />
      </Button>

      {/* File list */}
      {attachedFiles.length > 0 && (
        <div className="mt-2 space-y-2">
          {attachedFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-2 rounded border bg-gray-50 p-2 dark:bg-gray-800"
            >
              {file.previewUrl && (
                <Image
                  src={file.previewUrl}
                  alt={file.name}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-sm">{file.name}</p>
                <p className="text-gray-500 text-xs">
                  {formatFileSize(file.size)}
                  {file.uploading && " • Uploading..."}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(file.id)}
                className="h-6 w-6 p-1"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone for when component is focused */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="pointer-events-none absolute inset-0"
      />
    </div>
  );
}
