'use client';

import { useState, useRef, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface CropResult {
  analysis: {
    title: string;
    effection: string;
  };
  output: {
    download_url: string;
  };
  crop_params: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  metadata: {
    original: { width: number; height: number };
    cropped: { width: number; height: number };
  };
}

// Dot 组件用于底部切换指示器
interface DotProps {
  active: boolean;
  onClick: () => void;
  label: string;
}

function Dot({ active, onClick, label }: DotProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`h-3 w-3 rounded-full border transition-all duration-200 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF6B4A]/20 ${
        active
          ? "bg-[#FF6B4A] border-[#FF6B4A]"
          : "bg-white border-[#E7EAF0] hover:bg-[#FAFAFB]"
      }`}
    />
  );
}

export default function Home() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cropResult, setCropResult] = useState<CropResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOriginalLarge, setShowOriginalLarge] = useState<boolean>(false);
  const [originalImageDimensions, setOriginalImageDimensions] = useState<{width: number, height: number} | null>(null);
  const [croppedImageDimensions, setCroppedImageDimensions] = useState<{width: number, height: number} | null>(null);

  // Manual crop states
  const [src, setSrc] = useState<string>('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [manualCroppedUrl, setManualCroppedUrl] = useState<string>('');
  const imgRef = useRef<HTMLImageElement | null>(null);
  const touchStartX = useRef<number | null>(null);

  // 切换视图大小
  const toggleViewSize = () => {
    setShowOriginalLarge(prev => !prev);
  };

  // 处理原图加载
  const handleOriginalImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    setOriginalImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight
    });
  };

  // 处理裁剪图加载
  const handleCroppedImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    setCroppedImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight
    });
  };

  // 获取动态容器样式
  const getContainerStyle = (dimensions: {width: number, height: number} | null, isLarge: boolean) => {
    if (!dimensions) {
      return {
        className: "aspect-[3/4]",
        style: {}
      };
    }

    const aspectRatio = dimensions.width / dimensions.height;

    if (isLarge) {
      if (aspectRatio > 2) {
        return {
          className: "",
          style: { aspectRatio: aspectRatio.toString(), maxHeight: '400px' }
        };
      } else if (aspectRatio < 0.5) {
        return {
          className: "",
          style: { aspectRatio: aspectRatio.toString(), maxHeight: '800px' }
        };
      } else {
        return {
          className: "",
          style: { aspectRatio: aspectRatio.toString(), maxHeight: '600px' }
        };
      }
    } else {
      return {
        className: "aspect-[3/4]",
        style: {}
      };
    }
  };

  // 键盘事件处理
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (['ArrowLeft', 'ArrowRight', ' ', 'Enter'].includes(e.key)) {
      e.preventDefault();
      toggleViewSize();
    }
  };

  // 触摸开始
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  // 触摸结束 - 检测左右轻扫
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;

    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    const swipeThreshold = 36;

    if (Math.abs(dx) > swipeThreshold) {
      toggleViewSize();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      setSelectedFile(files[0]);
      setOriginalImageDimensions(null);
      setCroppedImageDimensions(null);
      setCropResult(null);
      setError(null);

      // Set preview for manual crop
      const reader = new FileReader();
      reader.addEventListener('load', () => setSrc(reader.result as string));
      reader.readAsDataURL(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      setOriginalImageDimensions(null);
      setCroppedImageDimensions(null);
      setCropResult(null);
      setError(null);

      // Set preview for manual crop
      const reader = new FileReader();
      reader.addEventListener('load', () => setSrc(reader.result as string));
      reader.readAsDataURL(files[0]);
    }
  };

  const handleCropProcess = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await fetch('/api/crop', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('AI分析失败');
      }

      // Simulate AI analysis result
      const mockResult: CropResult = {
        analysis: {
          title: '黄金分割构图优化',
          effection: '通过AI视觉分析，调整构图重心，突出主体，营造更佳的视觉平衡感。遵循黄金分割比例，优化视觉焦点分布。'
        },
        output: {
          download_url: URL.createObjectURL(selectedFile) // Mock URL
        },
        crop_params: {
          x: Math.floor(Math.random() * 100),
          y: Math.floor(Math.random() * 50),
          width: 800,
          height: 600
        },
        metadata: {
          original: originalImageDimensions || { width: 1200, height: 900 },
          cropped: { width: 800, height: 600 }
        }
      };

      setCropResult(mockResult);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'AI裁剪处理失败，请稍后重试');
    } finally {
      setIsProcessing(false);
    }
  };

  // Manual crop functions
  const onImageLoaded = useCallback((img: HTMLImageElement) => {
    imgRef.current = img;
    setCrop({
      unit: '%',
      x: 25,
      y: 25,
      width: 50,
      height: 50,
    });
    return false;
  }, []);

  const getCroppedImg = async (): Promise<string | null> => {
    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image!.naturalWidth / image!.width;
    const scaleY = image!.naturalHeight / image!.height;
    const ctx = canvas.getContext('2d');

    if (!completedCrop) return null;

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

  const handleManualCrop = async () => {
    if (!completedCrop) return;
    const croppedUrl = await getCroppedImg();
    if (croppedUrl) {
      setManualCroppedUrl(croppedUrl);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFB]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Site Name */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.89-2-2s.89-2 2-2 2 .89 2 2-.89 2-2 2zm0 12c-1.1 0-2-.89-2-2s.89-2 2-2 2 .89 2 2-.89 2-2 2zm6-7.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5zM19 3l-6 6 2 2 7-7V3h-3z"/>
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900">SnapCrop</h1>
            </div>

            {/* Right side controls */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <select
                  defaultValue="zh"
                  className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors cursor-pointer"
                >
                  <option value="zh">中文</option>
                  <option value="en">English</option>
                  <option value="ja">日本語</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-[#111827] mb-4">
            AI智能图片裁剪工具
          </h2>
          <p className="text-xl text-[#374151] mb-8">
            使用AI技术智能分析图片构图，一键生成完美裁剪方案
          </p>
        </div>

        {/* Upload Section - Hidden when showing results */}
        {!cropResult && (
          <div className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(16,24,40,0.06)] border border-[#E7EAF0] p-8 mb-8">
            <h3 className="text-2xl font-semibold text-[#111827] mb-2 text-center">
              AI智能裁剪
            </h3>
            <p className="text-[#374151] mb-6 text-center">
              上传图片，使用AI技术进行智能裁剪，快速获得完美构图
            </p>

            {!selectedFile ? (
              <div
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                  isDragOver
                    ? "border-blue-500 bg-blue-50"
                    : "border-[#E7EAF0] bg-[#FAFAFB]"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-medium text-[#374151]">
                      拖拽图片到这里或点击选择文件
                    </p>
                    <p className="text-sm text-[#6B7280] mt-1">
                      支持 JPG, PNG, WebP, GIF 格式
                    </p>
                  </div>
                  <button
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    选择图片
                  </button>
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>
            ) : (
              <div className="text-center">
                {isProcessing ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="text-lg text-gray-700">
                        正在进行AI分析处理...
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="relative">
                      <img
                        src={URL.createObjectURL(selectedFile)}
                        alt="Selected"
                        className="max-w-full h-auto rounded-lg shadow-lg mx-auto max-h-96"
                        onLoad={handleOriginalImageLoad}
                      />
                    </div>
                    <div className="flex justify-center space-x-4 flex-wrap">
                      <button
                        onClick={handleCropProcess}
                        className="px-6 py-3 bg-[#FF6B4A] hover:bg-[#E85E43] text-white rounded-lg font-medium shadow-md transition-colors"
                      >
                        ✨ AI自动裁剪
                      </button>
                      <button
                        onClick={() => {
                          setSelectedFile(null);
                          setCropResult(null);
                          setError(null);
                          setSrc('');
                          setManualCroppedUrl('');
                        }}
                        className="px-6 py-3 border border-[#E7EAF0] text-[#374151] hover:bg-[#FAFAFB] rounded-lg font-medium transition-colors"
                      >
                        重新选择
                      </button>
                    </div>

                    {/* Manual Crop Section */}
                    {src && (
                      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                        <h4 className="text-lg font-medium text-gray-900 mb-4">手动裁剪预览</h4>
                        <div className="max-w-lg mx-auto">
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
                          <div className="mt-4 text-center">
                            <button
                              onClick={handleManualCrop}
                              disabled={!completedCrop}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                            >
                              ✂️ 手动裁剪
                            </button>
                          </div>
                          {manualCroppedUrl && (
                            <div className="mt-4 text-center">
                              <img
                                alt="Manual crop result"
                                src={manualCroppedUrl}
                                className="max-w-full h-auto rounded-lg border mx-auto"
                              />
                              <div className="mt-2">
                                <a
                                  href={manualCroppedUrl}
                                  download="manual-cropped-image.jpg"
                                  className="inline-block px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                                >
                                  📥 下载手动裁剪结果
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Crop Result Display */}
        {cropResult && (
          <div className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(16,24,40,0.06)] border border-[#E7EAF0] p-8">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-semibold text-[#111827]">🎯 AI分析结果</h3>
              <p className="text-sm text-[#6B7280] mt-2">
                💡 点击图片、轻扫或按键切换查看模式
              </p>
            </div>

            {/* AI裁剪方案显示 */}
            <div className="mb-6">
              <h4 className="text-lg font-medium text-[#FF6B4A] mb-3 flex items-center">
                <span className="mr-2">💡</span>
                AI裁剪方案
              </h4>
              <div className="bg-[#FFF6EB] rounded-lg p-4">
                <p className="text-[#111827] font-medium mb-2">
                  {cropResult.analysis.title}
                </p>
                <p className="text-[#374151] text-base">
                  {cropResult.analysis.effection}
                </p>
              </div>
            </div>

            {/* 构图对比：固定左右 + 大小切换 */}
            <div
              className="mb-8 w-full select-none"
              role="region"
              aria-label="构图查看器"
              onKeyDown={handleKeyDown}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              tabIndex={0}
            >
              {cropResult.output?.download_url && selectedFile ? (
                <div className="space-y-6">
                  <div className="flex gap-4 items-start">
                    {/* 左：原图（大小可切换） */}
                    <div
                      className={
                        "transition-all duration-300 ease-out " +
                        (showOriginalLarge ? "flex-1" : "flex-shrink-0 w-[200px]")
                      }
                    >
                      <div className="relative bg-[#F5F7FF] rounded-xl border border-[#E7EAF0] shadow-sm p-4">
                        <div
                          className={
                            "group relative overflow-hidden rounded-lg bg-[#F5F7FF] " +
                            getContainerStyle(originalImageDimensions, showOriginalLarge).className
                          }
                          style={getContainerStyle(originalImageDimensions, showOriginalLarge).style}
                        >
                          <img
                            src={URL.createObjectURL(selectedFile)}
                            alt="原始图片"
                            draggable={false}
                            className={
                              "cursor-pointer transition-all duration-500 ease-out will-change-transform " +
                              (showOriginalLarge
                                ? "w-full h-auto object-contain"
                                : "h-full w-full object-contain scale-[1.0] hover:scale-105")
                            }
                            onClick={toggleViewSize}
                            onLoad={handleOriginalImageLoad}
                          />
                        </div>
                        <div className="mt-2 text-center text-sm font-medium text-[#374151]">原图</div>
                      </div>
                    </div>

                    {/* 右：裁剪结果（大小可切换） */}
                    <div
                      className={
                        "transition-all duration-300 ease-out " +
                        (showOriginalLarge ? "flex-shrink-0 w-[200px]" : "flex-1")
                      }
                    >
                      <div className="relative rounded-xl border border-[#E7EAF0] bg-[#FFF6EB] shadow-sm p-4">
                        <div
                          className={
                            "group relative overflow-hidden rounded-lg bg-[#FFF6EB] " +
                            getContainerStyle(croppedImageDimensions, !showOriginalLarge).className
                          }
                          style={getContainerStyle(croppedImageDimensions, !showOriginalLarge).style}
                        >
                          <img
                            src={cropResult.output.download_url}
                            alt="裁剪后图片"
                            draggable={false}
                            className={
                              "transition-all duration-500 ease-out will-change-transform cursor-pointer " +
                              (!showOriginalLarge
                                ? "w-full h-auto object-contain"
                                : "h-full w-full object-contain scale-[1.0]")
                            }
                            onClick={toggleViewSize}
                            onLoad={handleCroppedImageLoad}
                          />
                        </div>
                        <div className="mt-2 text-center text-sm font-medium text-[#374151]">裁剪结果</div>
                      </div>
                    </div>
                  </div>

                  {/* 独立的切换控制组件 */}
                  <div className="flex flex-col items-center gap-4 py-4">
                    <div className="flex items-center gap-3">
                      <Dot
                        active={showOriginalLarge}
                        onClick={() => setShowOriginalLarge(true)}
                        label="原图"
                      />
                      <Dot
                        active={!showOriginalLarge}
                        onClick={() => setShowOriginalLarge(false)}
                        label="裁剪结果"
                      />
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex justify-center items-center gap-4">
                      <button
                        onClick={() => {
                          setSelectedFile(null);
                          setCropResult(null);
                          setError(null);
                          setSrc('');
                          setManualCroppedUrl('');
                        }}
                        className="px-4 py-2 text-sm border border-[#E7EAF0] text-[#374151] hover:bg-[#FAFAFB] rounded-lg transition-colors"
                      >
                        🔄 重新开始
                      </button>
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = cropResult.output.download_url;
                          link.download = 'ai-cropped-image.jpg';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="px-4 py-2 bg-[#FF6B4A] hover:bg-[#E85E43] text-white text-sm font-medium shadow-sm rounded-lg transition-colors"
                      >
                        📥 下载裁剪结果
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Crop Parameters Section */}
            <div>
              <h4 className="text-lg font-medium text-[#FF6B4A] mb-3 flex items-center">
                <span className="mr-2">👁️</span>
                裁剪参数
              </h4>
              <div className="bg-[#FFF6EB] rounded-lg p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">原始尺寸:</span>
                    <span className="font-mono text-[#374151]">
                      {cropResult.metadata.original.width} × {cropResult.metadata.original.height}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">裁剪区域:</span>
                    <span className="font-mono text-[#374151]">
                      {cropResult.crop_params.width} × {cropResult.crop_params.height}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">裁剪位置:</span>
                    <span className="font-mono text-[#374151]">
                      ({cropResult.crop_params.x}, {cropResult.crop_params.y})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">输出尺寸:</span>
                    <span className="font-mono text-[#374151]">
                      {cropResult.metadata.cropped.width} × {cropResult.metadata.cropped.height}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">数据源:</span>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                      🤖 AI模型
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}