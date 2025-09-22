'use client';

import { useState, useRef } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

export default function Home() {
  const [src, setSrc] = useState<string>('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [croppedImageUrl, setCroppedImageUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setSrc(reader.result as string));
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onImageLoaded = (img: HTMLImageElement) => {
    imgRef.current = img;
    const { width, height } = img;
    setCrop({
      unit: '%',
      x: 25,
      y: 25,
      width: 50,
      height: 50,
    });
    return false;
  };

  const getCroppedImg = async () => {
    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image!.naturalWidth / image!.width;
    const scaleY = image!.naturalHeight / image!.height;
    const ctx = canvas.getContext('2d');

    if (!completedCrop) return;

    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;

    ctx!.drawImage(
      image!,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );

    return new Promise<string>((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        resolve(url);
      }, 'image/jpeg');
    });
  };

  const handleAICrop = async () => {
    if (!imgRef.current) return;

    setIsProcessing(true);
    try {
      // 将canvas转换为File对象
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = imgRef.current;

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx!.drawImage(img, 0, 0);

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg');
      });

      const formData = new FormData();
      formData.append('image', blob, 'image.jpg');

      const response = await fetch('/api/crop', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        // 这里模拟AI裁剪结果，实际应用中会返回裁剪后的图片
        const croppedUrl = await getCroppedImg();
        if (croppedUrl) {
          setCroppedImageUrl(croppedUrl);
        }
      }
    } catch (error) {
      console.error('AI裁剪失败:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualCrop = async () => {
    if (!completedCrop) return;

    const croppedUrl = await getCroppedImg();
    if (croppedUrl) {
      setCroppedImageUrl(croppedUrl);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '2rem', color: '#111827' }}>AI智能图片裁剪工具</h1>

      <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <input
            type="file"
            accept="image/*"
            onChange={onSelectFile}
            style={{
              marginBottom: '1rem',
              display: 'block',
              width: '100%',
              fontSize: '0.875rem',
              color: '#6b7280',
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              backgroundColor: '#fff'
            }}
          />
        </div>

        {src && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>原图片</h2>
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={undefined}
              >
                <img
                  ref={imgRef}
                  alt="Crop me"
                  src={src}
                  onLoad={(e) => onImageLoaded(e.currentTarget)}
                  className="max-w-full h-auto"
                />
              </ReactCrop>

              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                <button
                  onClick={handleAICrop}
                  disabled={isProcessing}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    borderRadius: '0.25rem',
                    border: 'none',
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    opacity: isProcessing ? 0.5 : 1
                  }}
                >
                  {isProcessing ? '处理中...' : 'AI智能裁剪'}
                </button>
                <button
                  onClick={handleManualCrop}
                  disabled={!completedCrop}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#16a34a',
                    color: 'white',
                    borderRadius: '0.25rem',
                    border: 'none',
                    cursor: !completedCrop ? 'not-allowed' : 'pointer',
                    opacity: !completedCrop ? 0.5 : 1
                  }}
                >
                  手动裁剪
                </button>
              </div>
            </div>

            {croppedImageUrl && (
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>裁剪结果</h2>
                <img
                  alt="Crop"
                  src={croppedImageUrl}
                  style={{ maxWidth: '100%', height: 'auto', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
                />
                <div style={{ marginTop: '1rem' }}>
                  <a
                    href={croppedImageUrl}
                    download="cropped-image.jpg"
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#9333ea',
                      color: 'white',
                      borderRadius: '0.25rem',
                      textDecoration: 'none',
                      display: 'inline-block'
                    }}
                  >
                    下载裁剪图片
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}