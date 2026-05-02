// Augment standard lib with the File System Access permission methods,
// which exist at runtime in Chrome but aren't in TS's bundled DOM lib.

interface FileSystemHandlePermissionDescriptor {
  mode?: "read" | "readwrite";
}

interface FileSystemHandle {
  queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
}

interface Window {
  showDirectoryPicker(options?: {
    mode?: "read" | "readwrite";
    startIn?: string | FileSystemHandle;
    id?: string;
  }): Promise<FileSystemDirectoryHandle>;
}
