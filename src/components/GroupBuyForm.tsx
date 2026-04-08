'use client';
import { useState, useRef } from 'react';
import GlassCard from '@/components/GlassCard';
import { getLabel } from '@/lib/utils';

export interface OptionFormData {
  id?: number;
  label: string;
  name: string;
  description: string;
  image_url: string;
  _imageFile?: File | null;
  _imagePreview?: string;
}

export interface GroupBuyFormData {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  end_hour: number;
  is_public: boolean;
  image_urls: string[];
  _imageFiles: File[];
  _imagePreviews: string[];
  options: OptionFormData[];
}

interface Props {
  initialData?: Partial<GroupBuyFormData>;
  onSubmit: (data: GroupBuyFormData) => Promise<void>;
  submitLabel: string;
  loading: boolean;
  error: string;
  onCancel?: () => void;
}

async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  if (!res.ok) throw new Error('圖片上傳失敗');
  const data = await res.json();
  return data.url as string;
}

export async function resolveFormImages(form: GroupBuyFormData): Promise<string[]> {
  const uploaded = await Promise.all(form._imageFiles.map(uploadFile));
  return [...form.image_urls, ...uploaded];
}

export async function resolveOptionImage(opt: OptionFormData): Promise<string> {
  if (opt._imageFile) return uploadFile(opt._imageFile);
  return opt.image_url;
}

export default function GroupBuyForm({ initialData, onSubmit, submitLabel, loading, error, onCancel }: Props) {
  const [form, setForm] = useState<GroupBuyFormData>(() => {
    const base: GroupBuyFormData = {
      title: '',
      description: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      end_hour: 23,
      is_public: false,
      image_urls: [],
      _imageFiles: [],
      _imagePreviews: [],
      options: [{ label: 'A', name: '', description: '', image_url: '' }],
    };
    if (!initialData) return base;
    // Parse stored end_date: may be "YYYY-MM-DD" or "YYYY-MM-DDTHH:00"
    let endDatePart = initialData.end_date ?? '';
    let endHour = 23;
    if (endDatePart.includes('T')) {
      const d = new Date(endDatePart);
      endHour = d.getHours();
      endDatePart = endDatePart.split('T')[0];
    }
    return {
      ...base,
      ...initialData,
      end_date: endDatePart,
      end_hour: endHour,
      _imageFiles: [],
      _imagePreviews: [],
      image_urls: initialData.image_urls ?? [],
      options: initialData.options ?? base.options,
    };
  });

  const coverInputRef = useRef<HTMLInputElement>(null);

  const addCoverImages = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    const newPreviews = newFiles.map(f => URL.createObjectURL(f));
    setForm(p => ({
      ...p,
      _imageFiles: [...p._imageFiles, ...newFiles],
      _imagePreviews: [...p._imagePreviews, ...newPreviews],
    }));
  };

  const removeExistingImage = (idx: number) => {
    setForm(p => ({ ...p, image_urls: p.image_urls.filter((_, i) => i !== idx) }));
  };

  const removeNewImage = (idx: number) => {
    setForm(p => ({
      ...p,
      _imageFiles: p._imageFiles.filter((_, i) => i !== idx),
      _imagePreviews: p._imagePreviews.filter((_, i) => i !== idx),
    }));
  };

  const addOption = () => {
    if (form.options.length >= 26) return;
    setForm(p => ({
      ...p,
      options: [...p.options, { label: getLabel(p.options.length), name: '', description: '', image_url: '' }],
    }));
  };

  const removeOption = (i: number) => {
    setForm(p => {
      const next = p.options.filter((_, idx) => idx !== i).map((o, idx) => ({ ...o, label: getLabel(idx) }));
      return { ...p, options: next };
    });
  };

  const updateOption = (i: number, field: keyof OptionFormData, value: string) => {
    setForm(p => ({ ...p, options: p.options.map((o, idx) => idx === i ? { ...o, [field]: value } : o) }));
  };

  const setOptionImage = (i: number, file: File) => {
    const preview = URL.createObjectURL(file);
    setForm(p => ({
      ...p,
      options: p.options.map((o, idx) => idx === i ? { ...o, _imageFile: file, _imagePreview: preview } : o),
    }));
  };

  const removeOptionImage = (i: number) => {
    setForm(p => ({
      ...p,
      options: p.options.map((o, idx) => idx === i ? { ...o, _imageFile: null, _imagePreview: '', image_url: '' } : o),
    }));
  };

  const autoFill = () => {
    const today = new Date().toISOString().split('T')[0];
    const next14 = new Date(Date.now() + 14 * 864e5).toISOString().split('T')[0];
    setForm(p => ({
      ...p,
      title: '測試零食團購',
      description: '這是測試用的團購說明，請忽略。',
      start_date: today,
      end_date: next14,
      end_hour: 23,
      is_public: true,
      options: [
        { label: 'A', name: '原味洋芋片', description: '最暢銷口味', image_url: '' },
        { label: 'B', name: '海鹽起司味', description: '鹹甜交織', image_url: '' },
        { label: 'C', name: '辣椒BBQ', description: '重口味首選', image_url: '' },
      ],
    }));
  };

  const totalImages = form.image_urls.length + form._imagePreviews.length;

  return (
    <form onSubmit={e => {
      e.preventDefault();
      const combined = form.end_date
        ? { ...form, end_date: `${form.end_date}T${String(form.end_hour).padStart(2, '0')}:00` }
        : form;
      onSubmit(combined);
    }} className="flex flex-col gap-6">
      <GlassCard className="p-6 flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-white">基本資訊</h2>
        <div>
          <label className="block text-white/70 text-sm mb-1">團購名稱 *</label>
          <input className="glass-input" placeholder="例如：4月零食團購" value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
        </div>
        <div>
          <label className="block text-white/70 text-sm mb-1">說明（可選）</label>
          <textarea className="glass-input min-h-[80px] resize-y" placeholder="團購說明、注意事項..."
            value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </div>

        {/* Multiple cover images */}
        <div>
          <label className="block text-white/70 text-sm mb-2">
            封面圖片（可選，支援多張，每張最大 5MB）
          </label>
          {totalImages > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {form.image_urls.map((url, i) => (
                <div key={"ex" + i} className="relative group w-20 h-20">
                  <img src={url} alt="" className="w-full h-full object-cover rounded-lg border border-white/20" />
                  <button type="button" onClick={() => removeExistingImage(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity leading-none">
                    ×
                  </button>
                </div>
              ))}
              {form._imagePreviews.map((url, i) => (
                <div key={"new" + i} className="relative group w-20 h-20">
                  <img src={url} alt="" className="w-full h-full object-cover rounded-lg border border-indigo-400/40" />
                  <div className="absolute bottom-0 left-0 right-0 bg-indigo-500/60 text-white text-[9px] text-center rounded-b-lg py-0.5">待上傳</div>
                  <button type="button" onClick={() => removeNewImage(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity leading-none">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <input ref={coverInputRef} type="file" accept="image/*" multiple
            onChange={e => { addCoverImages(e.target.files); e.target.value = ''; }}
            className="text-white/70 text-sm file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-indigo-500/50 file:text-white file:cursor-pointer" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-white/70 text-sm mb-1">開始日期 *</label>
            <input type="date" className="glass-input" value={form.start_date}
              onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-white/70 text-sm mb-1">截止日期 *</label>
            <input type="date" className="glass-input" value={form.end_date}
              onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} required />
          </div>
        </div>
        <div>
          <label className="block text-white/70 text-sm mb-1">截止時間 *</label>
          <select className="glass-input" value={form.end_hour}
            onChange={e => setForm(p => ({ ...p, end_hour: Number(e.target.value) }))}>
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>{String(h).padStart(2, '0')}:00（{h} 點）</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <input type="checkbox" id="is_public" checked={form.is_public}
            onChange={e => setForm(p => ({ ...p, is_public: e.target.checked }))}
            className="w-5 h-5 accent-indigo-500" />
          <label htmlFor="is_public" className="text-white/70 text-sm cursor-pointer">
            公開顯示於首頁（任何人都能在首頁看到此團購）
          </label>
        </div>
      </GlassCard>

      {/* Options with per-option images */}
      <GlassCard className="p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">品項設定</h2>
          <button type="button" onClick={addOption} className="btn-secondary text-sm px-4 py-2">
            + 新增品項
          </button>
        </div>
        {form.options.map((opt, i) => (
          <div key={i} className="bg-white/5 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="bg-indigo-500/40 text-indigo-200 font-bold w-8 h-8 flex items-center justify-center rounded-full">
                {opt.label}
              </span>
              {form.options.length > 1 && (
                <button type="button" onClick={() => removeOption(i)} className="text-red-400 hover:text-red-300 text-sm">
                  刪除品項
                </button>
              )}
            </div>
            <input className="glass-input" placeholder="品項名稱 *" value={opt.name}
              onChange={e => updateOption(i, 'name', e.target.value)} required />
            <input className="glass-input" placeholder="品項說明（可選）" value={opt.description}
              onChange={e => updateOption(i, 'description', e.target.value)} />
            <div>
              <label className="block text-white/50 text-xs mb-1.5">品項圖片（可選）</label>
              {(opt._imagePreview || opt.image_url) ? (
                <div className="flex items-center gap-3">
                  <img src={opt._imagePreview || opt.image_url} alt=""
                    className="w-16 h-16 object-cover rounded-lg border border-white/20" />
                  <button type="button" onClick={() => removeOptionImage(i)}
                    className="text-red-400 hover:text-red-300 text-xs">移除圖片</button>
                </div>
              ) : (
                <input type="file" accept="image/*"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { setOptionImage(i, f); e.target.value = ''; } }}
                  className="text-white/60 text-xs file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:bg-white/10 file:text-white/70 file:cursor-pointer" />
              )}
            </div>
          </div>
        ))}
      </GlassCard>

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      <div className="flex gap-3">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary flex-1">取消</button>
        )}
        <button type="submit" className="btn-primary flex-1" disabled={loading}>
          {loading ? '處理中...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
