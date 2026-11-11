import os
import zipfile
import time

workspace = r"D:\IS_2018_Ec_Second_Semister\Project\EthioCraft Global"
zip_filename = os.path.join(workspace, "EthioCraft_Deployment.zip")

# Remove existing zip if any
if os.path.exists(zip_filename):
    os.remove(zip_filename)

# Patterns / folders to completely exclude
EXCLUDE_DIRS = {
    'node_modules',
    '.git',
    '.vscode',
    '__pycache__',
    '.idea',
    '.system_generated',
    'scratch'
}

EXCLUDE_FILES = {
    'EthioCraft_Deployment.zip',
    '.DS_Store',
    'Thumbs.db'
}

print("Scanning files to package...")
start_time = time.time()
file_count = 0
total_uncompressed_bytes = 0

with zipfile.ZipFile(zip_filename, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zipf:
    for root, dirs, files in os.walk(workspace):
        # Modify dirs in-place to skip excluded directories
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith('.git')]
        
        for file in files:
            if file in EXCLUDE_FILES or file.endswith('.zip') or file.endswith('.pyc'):
                continue
            
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, workspace)
            
            # Double check that no part of the relative path is in EXCLUDE_DIRS
            parts = rel_path.split(os.sep)
            if any(p in EXCLUDE_DIRS for p in parts):
                continue
                
            try:
                size = os.path.getsize(full_path)
                zipf.write(full_path, rel_path)
                file_count += 1
                total_uncompressed_bytes += size
                if file_count % 100 == 0:
                    print(f"Packaged {file_count} files...")
            except Exception as e:
                print(f"Skipping {rel_path}: {e}")

elapsed = time.time() - start_time
zip_size = os.path.getsize(zip_filename)

print("\n--- ZIP CREATION COMPLETE ---")
print(f"File Name: {os.path.basename(zip_filename)}")
print(f"Path: {zip_filename}")
print(f"Total Files Packaged: {file_count}")
print(f"Uncompressed Size: {total_uncompressed_bytes / (1024*1024):.2f} MB")
print(f"Compressed ZIP Size: {zip_size / (1024*1024):.2f} MB")
print(f"Time Taken: {elapsed:.2f} seconds")

