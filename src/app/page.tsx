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
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-900">AI智能图片裁剪工具</h1>

      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <input
            type="file"
            accept="image/*"
            onChange={onSelectFile}
            className="mb-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {src && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">原图片</h2>
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

              <div className="mt-4 space-x-4">
                <button
                  onClick={handleAICrop}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {isProcessing ? '处理中...' : 'AI智能裁剪'}
                </button>
                <button
                  onClick={handleManualCrop}
                  disabled={!completedCrop}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  手动裁剪
                </button>
              </div>
            </div>

            {croppedImageUrl && (
              <div>
                <h2 className="text-xl font-semibold mb-4">裁剪结果</h2>
                <img
                  alt="Crop"
                  src={croppedImageUrl}
                  className="max-w-full h-auto border rounded"
                />
                <div className="mt-4">
                  <a
                    href={croppedImageUrl}
                    download="cropped-image.jpg"
                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 inline-block"
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