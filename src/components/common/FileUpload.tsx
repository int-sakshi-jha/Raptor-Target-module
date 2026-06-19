import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, File, X } from "lucide-react";

interface FileUploadProps {
  label?: string;
  star?: boolean;
  accept?: Record<string, string[]>;
  multiple?: boolean;
  onChange: (files: File[]) => void;
  value?: File[];
  errorMessage?: string;
  existingFiles?: { fileName: string }[];
  removeExistingFiles?: (file: { fileName: string }) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({
  label,
  star,
  accept,
  multiple = false,
  onChange,
  value = [],
  errorMessage,
  existingFiles = [],
  removeExistingFiles,
}) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onChange(multiple ? [...value, ...acceptedFiles] : acceptedFiles);
    },
    [onChange, multiple, value]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple,
  });

  const removeFile = (fileToRemove: File) => {
    onChange(value.filter((file) => file !== fileToRemove));
  };

  return (
    <div className="space-y-2 w-full">
      {label && (
        <label className="text-neutral-700 dark:text-neutral-dark-900 font-medium">
          {label}
          {star && <sup className="text-error-500 dark:text-error-dark-500 ml-1">*</sup>}
        </label>
      )}
      <div
        {...getRootProps()}
        className={`card p-6 border-2 border-dashed rounded-lg transition-all duration-300 ${
          isDragActive
            ? "border-brand-600 bg-brand-50 dark:bg-neutral-dark-200"
            : "border-neutral-300 dark:border-neutral-dark-300 bg-white dark:bg-neutral-dark-100"
        } ${errorMessage ? "border-error-500 dark:border-error-dark-500" : ""}`}
      >
        <input {...getInputProps()} />
        <div className="text-center">
          <Upload className="mx-auto h-12 w-12 text-brand-600" />
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-dark-500">
            Drag &apos;n&apos; drop files here, or click to select files
          </p>
        </div>
      </div>
      {errorMessage && (
        <span className="mt-1 text-xs text-error-500 dark:text-error-dark-500">
          {errorMessage}
        </span>
      )}
      {existingFiles.length > 0 && (
        <div className="mt-2">
          <p className="text-neutral-600 dark:text-neutral-dark-500">Existing files:</p>
          <ul className="mt-2 space-y-2">
            {existingFiles.map((file, index) => (
              <li
                key={index}
                className="card flex items-center justify-between p-2 rounded-md"
              >
                <div className="flex items-center">
                  <File className="mr-2 text-brand-600" size={16} />
                  <span className="text-sm text-neutral-700 dark:text-neutral-dark-900">
                    {file.fileName}
                  </span>
                </div>
                {removeExistingFiles && (
                  <button
                    type="button"
                    onClick={() => removeExistingFiles(file)}
                    className="text-error-500 dark:text-error-dark-500 hover:text-error-600 dark:hover:text-error-dark-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {value.length > 0 && (
        <div className="mt-2">
          <p className="text-neutral-600 dark:text-neutral-dark-500">Selected files:</p>
          <ul className="mt-2 space-y-2">
            {value.map((file, index) => (
              <li
                key={index}
                className="card flex items-center justify-between p-2 rounded-md"
              >
                <div className="flex items-center">
                  <File className="mr-2 text-brand-600" size={16} />
                  <span className="text-sm text-neutral-700 dark:text-neutral-dark-900">
                    {file.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(file)}
                  className="text-error-500 dark:text-error-dark-500 hover:text-error-600 dark:hover:text-error-dark-600"
                >
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileUpload;