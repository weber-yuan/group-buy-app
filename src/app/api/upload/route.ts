import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { put } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: '請先登入' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) return Response.json({ error: '未收到檔案' }, { status: 400 });

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return Response.json({ error: '只支援 JPG、PNG、WebP、GIF' }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return Response.json({ error: '圖片不得超過 5MB' }, { status: 400 });
  }

  try {
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `uploads/${uuidv4()}.${ext}`;
    const blob = await put(filename, file, { access: 'public' });
    return Response.json({ url: blob.url });
  } catch (e) {
    console.error('[POST /api/upload]', e);
    return Response.json({ error: '上傳失敗' }, { status: 500 });
  }
}
