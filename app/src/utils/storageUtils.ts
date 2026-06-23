import { supabase } from '../supabaseClient';

/**
 * Extracts the file name from a public Supabase Storage URL.
 */
export const getFileNameFromUrl = (url: string): string => {
  if (!url) return '';
  const parts = url.split('/task_images/');
  if (parts.length > 1) {
    return parts[parts.length - 1];
  }
  const slashParts = url.split('/');
  return slashParts[slashParts.length - 1];
};

/**
 * Deletes images from the 'task_images' storage bucket using their URLs.
 */
export const deleteStorageImagesByUrls = async (urls: string[]) => {
  if (!urls || urls.length === 0) return;
  
  const fileNames = urls
    .map(url => getFileNameFromUrl(url))
    .filter(name => name.length > 0);

  if (fileNames.length > 0) {
    try {
      const { error } = await supabase.storage.from('task_images').remove(fileNames);
      if (error) {
        console.error('Error removing files from storage:', error);
      }
    } catch (err) {
      console.error('Failed to execute storage deletion:', err);
    }
  }
};

/**
 * Fetches tasks by their IDs and deletes their associated images and audit images from Storage.
 */
export const deleteStorageImagesForTasks = async (taskIds: string[]) => {
  if (!taskIds || taskIds.length === 0) return;
  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('images, audit_images')
      .in('id', taskIds);

    if (error) {
      console.error('Error fetching tasks for image deletion:', error);
      return;
    }

    if (tasks && tasks.length > 0) {
      const urls: string[] = [];
      tasks.forEach(task => {
        if (Array.isArray(task.images)) {
          urls.push(...task.images);
        }
        if (Array.isArray(task.audit_images)) {
          urls.push(...task.audit_images);
        }
      });
      await deleteStorageImagesByUrls(urls);
    }
  } catch (err) {
    console.error('Failed to delete storage images for tasks:', err);
  }
};

/**
 * Deletes all files currently stored in the 'task_images' bucket.
 */
export const clearAllStorageImages = async () => {
  try {
    const { data: files, error: listError } = await supabase.storage.from('task_images').list('', { limit: 10000 });
    if (listError) {
      console.error('Error listing files in task_images storage:', listError);
      return;
    }

    if (files && files.length > 0) {
      const fileNames = files.map(f => f.name);
      const { error: removeError } = await supabase.storage.from('task_images').remove(fileNames);
      if (removeError) {
        console.error('Error clearing task_images storage:', removeError);
      }
    }
  } catch (err) {
    console.error('Failed to clear storage images:', err);
  }
};
