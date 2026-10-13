'use server';

import { requirePermission } from '@/lib/dal';
import { createClient } from '@supabase/supabase-js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getObjectStorageClient, hasObjectStorageConfig, mediaUrlForKey, uploadsBucket } from '@/lib/object-storage';
import path from 'path';

// Setup Supabase admin client to bypass RLS and create buckets if needed
const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 
              process.env.SUPABASE_SECRET_KEY || 
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
              process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

  if (!url || !key) {
    throw new Error('مفاتيح Supabase مفقودة. يرجى إضافة مفتاح SUPABASE_SERVICE_ROLE_KEY أو NEXT_PUBLIC_SUPABASE_ANON_KEY في ملف .env');
  }

  return createClient(url, key, { auth: { persistSession: false } });
};

export async function generateUploadUrl(filename: string): Promise<{ success: boolean; token?: string; path?: string; publicUrl?: string; error?: string }> {
  try {
    await requirePermission('manage:settings');

    let ext = '';
    const lastDot = filename.lastIndexOf('.');
    if (lastDot !== -1) {
      ext = filename.substring(lastDot).toLowerCase();
    }
    
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm', '.ogg'];
    if (!allowedExts.includes(ext)) {
      return { success: false, error: 'صيغة الملف غير مدعومة' };
    }

    const newFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
    
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const isDummy = url === 'https://dummy.supabase.co' || !url;
    
    if (isDummy) {
      return { success: false, error: 'الرفع المباشر غير مدعوم محلياً بدون إعداد Supabase حقيقي. يرجى استخدام دالة uploadMedia للرفع المحلي.' };
    }

    const bucketName = 'uploads';
    const supabaseAdmin = getSupabaseAdmin();

    // Ensure bucket exists
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    if (listError) throw new Error('فشل جلب الحاويات: ' + listError.message);
    
    if (!buckets?.find(b => b.name === bucketName)) {
      const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, { public: true });
      if (createError) {
        throw new Error(`الرجاء إنشاء Bucket باسم '${bucketName}' من لوحة تحكم Supabase وتعيينه كـ Public. فشل الإنشاء التلقائي: ` + createError.message);
      }
    }

    // Create a signed upload URL valid for 5 minutes
    const { data, error } = await supabaseAdmin.storage.from(bucketName).createSignedUploadUrl(newFilename);

    if (error || !data) {
      throw new Error(error?.message || 'فشل في إنشاء رابط الرفع');
    }

    const { data: publicData } = supabaseAdmin.storage.from(bucketName).getPublicUrl(newFilename);

    return { 
      success: true, 
      token: data.token,
      path: data.path,
      publicUrl: publicData.publicUrl 
    };
  } catch (error: any) {
    console.error('Upload Error:', error);
    return { success: false, error: 'حدث خطأ' };
  }
}

// Keep this for backwards compatibility for small files if needed, but rewrite to use Supabase
export async function uploadMedia(formData: FormData): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    await requirePermission('manage:settings');

    const file = formData.get('file') as File | null;
    if (!file) return { success: false, error: 'لم يتم العثور على أي ملف' };

    const ext = path.extname(file.name).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm', '.ogg'];
    if (!allowedExts.includes(ext)) {
      return { success: false, error: 'صيغة الملف غير مدعومة' };
    }

    const newFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const isDummy = url === 'https://dummy.supabase.co' || !url;

    // A Vercel deployment has a read-only filesystem. When Supabase is not
    // configured, use the project's S3-compatible Neon object storage.
    if (isDummy) {
      if (hasObjectStorageConfig()) {
        const key = `uploads/${newFilename}`;
        await getObjectStorageClient().send(new PutObjectCommand({
          Bucket: uploadsBucket,
          Key: key,
          Body: buffer,
          ContentType: file.type || 'application/octet-stream',
          CacheControl: 'public, max-age=31536000, immutable',
        }));
        return { success: true, url: mediaUrlForKey(key) };
      }

      if (process.env.NODE_ENV === 'production') {
        return { success: false, error: 'إعدادات تخزين الملفات غير مكتملة.' };
      }

      // Local development fallback only.
      const fs = require('fs');
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      fs.writeFileSync(path.join(uploadDir, newFilename), buffer);
      return { success: true, url: `/uploads/${newFilename}` };
    }

    // Supabase Upload
    const bucketName = 'uploads';
    const supabaseAdmin = getSupabaseAdmin();

    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    if (listError) throw new Error('فشل جلب الحاويات: ' + listError.message);

    if (!buckets?.find(b => b.name === bucketName)) {
      const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, { public: true });
      if (createError) {
        throw new Error(`الرجاء إنشاء Bucket باسم '${bucketName}' من لوحة تحكم Supabase وتعيينه كـ Public. فشل الإنشاء التلقائي: ` + createError.message);
      }
    }
    
    const { error } = await supabaseAdmin.storage.from(bucketName).upload(newFilename, buffer, {
      contentType: file.type,
      upsert: true
    });

    if (error) throw new Error(error.message);

    const { data: publicData } = supabaseAdmin.storage.from(bucketName).getPublicUrl(newFilename);

    return { success: true, url: publicData.publicUrl };
  } catch (error: any) {
    console.error('Upload Error:', error);
    return { success: false, error: 'حدث خطأ أثناء الرفع' };
  }
}
